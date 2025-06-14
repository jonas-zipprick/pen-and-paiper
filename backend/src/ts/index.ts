import express, { Request, Response } from 'express';
import multer from 'multer';
const pdf = require('pdf-parse');
import cors from 'cors';
import {config} from './config'

// Initialize the Express application
const app = express();

// --- Middleware ---

// Enable Cross-Origin Resource Sharing (CORS) for all routes
// This allows the React frontend (running on a different port) to communicate with this server.
app.use(cors());

// Configure Multer for file uploads.
// We'll use memoryStorage to temporarily hold the file in memory as a Buffer.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Helper Functions ---

/**
 * Splits a long string of text into smaller chunks of a specified size.
 * @param text The full text to be split.
 * @param chunkSize The maximum number of characters for each chunk.
 * @returns An array of text chunks.
 */
const splitTextIntoChunks = (text: string, chunkSize: number): string[] => {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.substring(i, i + chunkSize));
        i += chunkSize;
    }
    return chunks;
};


const cleanText = (text: string): string => {
    // Step 1: Replace common ligatures. Ligatures are special characters
    // in fonts that combine two or more letters, like 'fi' or 'ffl'.
    // If not handled, they can appear as garbage characters.
    let cleaned = text
        .replace(/ﬀ/g, 'ff')
        .replace(/ﬁ/g, 'fi')
        .replace(/ﬂ/g, 'fl')
        .replace(/ﬃ/g, 'ffi')
        .replace(/ﬄ/g, 'ffl')
        .replace(/ﬅ/g, 'st');

    // Step 2: Join words that are hyphenated and split across newlines.
    // This removes the hyphen and the line break to form the complete word.
    cleaned = cleaned.replace(/-\n/g, '');
    
    // Step 3: Remove any character that is NOT a standard letter, number,
    // common punctuation, or whitespace. This is a whitelist approach to
    // eliminate the more random "junk" characters that can result from
    // font encoding issues.
    // We replace them with a space to avoid accidentally merging words.
    const unwantedCharsRegex = /[^a-zA-Z0-9\s.,;:!?'"()\[\]{}-]/g;
    cleaned = cleaned.replace(unwantedCharsRegex, ' ');

    // Step 4: Collapse multiple consecutive whitespace characters (spaces,
    // tabs, newlines) into a single space. This normalizes the text flow.
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
};



// --- API Routes ---

/**
 * @route POST /upload
 * @description Accepts a PDF file, parses it into text, splits the text into chunks, and returns the chunks.
 * The file should be sent as multipart/form-data with the key 'pdf'.
 * The `upload.single('pdf')` is standard multer middleware to handle a single file upload.
 */
app.post('/upload', upload.single('pdf'), async (req: Request, res: Response): Promise<void> => {
    try {
        // Check if a file was uploaded. Multer adds a 'file' object to the request.
        // The type definitions for multer should add `file` to the Express Request object automatically.
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded. Please upload a PDF.' });
            return;
        }

        // The uploaded file is available as a Buffer in req.file.buffer.
        const dataBuffer = req.file.buffer;

        // Use pdf-parse to extract text from the PDF buffer.
        const data = await pdf(dataBuffer);
        const textContent = cleanText(data.text);
        
        // Define the desired size of our text chunks.
        const chunkSize = 1000; // e.g., 1000 characters per chunk

        // Split the extracted text into chunks.
        const textChunks = splitTextIntoChunks(textContent, chunkSize);

        // Send the chunks back to the client as a JSON response.
        res.status(200).json({ chunks: textChunks });

    } catch (error) { 
        console.error('Error processing PDF:', error);
        res.status(500).json({ error: 'Failed to process the PDF file.' });
    }
});

// --- Server Initialization ---

// Start the Express server and listen for incoming requests on the specified port.
app.listen(config.port, () => {
    console.log(`Server is running at http://localhost:${config.port}`);
});

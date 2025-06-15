import pdfplumber
import sys
import os
from datetime import datetime
import re
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from typing import List, Dict, Tuple, Optional
import logging
import io

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def process_pdf_bytes(content: bytes, pdf_name: str, collection_name: str):
    logger.info(f"Starting to process PDF: {pdf_name} for collection: {collection_name}")
    try:
        pages = extract_pages_from_pdf(io.BytesIO(content))
        if not pages:
            logger.error(f"Failed to extract text from PDF {pdf_name}")
            return False
        if store_pages_in_chroma(pages, pdf_name, collection_name):
            logger.info(f"Successfully processed and stored PDF {pdf_name}")
            return True
        else:
            logger.error(f"Failed to store pages from '{pdf_name}'")
            return False
    except Exception as e:
        logger.exception(f"Error processing PDF {pdf_name}: {e}")
        return False

def clean_text(text: str) -> str:
    """Clean up extracted text by removing CID codes and normalizing spaces."""
    logger.debug("Starting text cleaning")
    # Remove CID codes
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Remove multiple spaces and normalize newlines
    text = ' '.join(text.split())
    
    # Remove any remaining control characters
    text = ''.join(char for char in text if ord(char) >= 32 or char == '\n')
    
    logger.debug(f"Text cleaning complete. Final length: {len(text)} characters")
    return text

def extract_pages_from_pdf(pdf_source) -> List[Tuple[int, str]]:
    """
    Extract text from each page of a PDF file.
    pdf_source can be a path (str/Path) or a file-like object containing bytes.
    Returns a list of tuples containing (page_number, cleaned_text).
    """
    logger.info("Starting PDF text extraction")
    try:
        with pdfplumber.open(pdf_source) as pdf:
            pages = []
            total_pages = len(pdf.pages)
            logger.info(f"PDF opened successfully. Total pages: {total_pages}")
            
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    logger.debug(f"Processing page {page_num}/{total_pages}")
                    # Try different extraction methods
                    page_text = page.extract_text()
                    if not page_text or len(page_text.strip()) < 10:  # If text seems too short
                        logger.warning(f"Initial text extraction for page {page_num} seems too short, trying alternative method")
                        # Try alternative extraction
                        page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                    
                    if page_text:
                        # Clean the page text
                        cleaned_page_text = clean_text(page_text)
                        cleaned_page_text += f"\nPage Number: {page_num}"
                        pages.append((page_num, cleaned_page_text))
                        logger.debug(f"Successfully extracted text from page {page_num}")
                    else:
                        logger.warning(f"No text could be extracted from page {page_num}")
                except Exception as e:
                    logger.error(f"Error extracting text from page {page_num}: {str(e)}")
                    continue
            
            logger.info(f"PDF extraction complete. Successfully extracted {len(pages)} out of {total_pages} pages")
            return pages
    except Exception as e:
        logger.error(f"Error opening or processing PDF: {str(e)}")
        return []

def get_chroma_client():
    """Get a ChromaDB client instance."""
    logger.debug("Initializing ChromaDB client")
    try:
        client = chromadb.Client(Settings(
            persist_directory="chroma_db",
            anonymized_telemetry=False
        ))
        logger.debug("ChromaDB client initialized successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize ChromaDB client: {str(e)}")
        raise

def get_embedding_function():
    """Get the Nomic embedding function."""
    logger.debug("Initializing embedding function")
    try:
        embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="nomic-ai/nomic-embed-text-v2-moe",
            trust_remote_code=True
        )
        logger.debug("Embedding function initialized successfully")
        return embedding_function
    except Exception as e:
        logger.error(f"Failed to initialize embedding function: {str(e)}")
        raise

def get_or_create_collection(collection_name: str):
    """Get an existing collection or create a new one."""
    logger.info(f"Getting or creating collection: {collection_name}")
    try:
        client = get_chroma_client()
        embedding_function = get_embedding_function()
        
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"description": f"Collection for {collection_name}"},
            embedding_function=embedding_function
        )
        logger.info(f"Successfully got/created collection: {collection_name}")
        return collection
    except Exception as e:
        logger.error(f"Failed to get/create collection {collection_name}: {str(e)}")
        raise

def list_chroma_collections():
    """List all collections in ChromaDB."""
    logger.info("Listing all ChromaDB collections")
    try:
        client = get_chroma_client()
        collections = client.list_collections()
        logger.info(f"Found {len(collections)} collections")
        return collections
    except Exception as e:
        logger.error(f"Failed to list collections: {str(e)}")
        raise

def delete_collection(collection_name: str) -> bool:
    """Delete a collection from ChromaDB."""
    logger.info(f"Attempting to delete collection: {collection_name}")
    try:
        client = get_chroma_client()
        client.delete_collection(collection_name)
        logger.info(f"Successfully deleted collection: {collection_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete collection {collection_name}: {str(e)}")
        return False

def store_pages_in_chroma(pages: List[Tuple[int, str]], pdf_name: str, collection_name: str) -> bool:
    """
    Store extracted pages in a specified ChromaDB collection.
    Returns True if successful, False otherwise.
    """
    try:
        logger.info(f"Attempting to store {len(pages)} pages from '{pdf_name}' in collection '{collection_name}'")
        
        collection = get_or_create_collection(collection_name)
        logger.info(f"Successfully got/created collection '{collection_name}'")
        
        # Prepare data for batch insertion
        page_nums = [page_num for page_num, _ in pages]
        texts = [text for _, text in pages]
        doc_ids = [f"{pdf_name}_page_{page_num}" for page_num in page_nums]
        
        metadatas = [{
            "page_number": page_num,
            "pdf_name": pdf_name,
            "timestamp": datetime.now().isoformat()
        } for page_num in page_nums]
        
        logger.info(f"Prepared {len(doc_ids)} documents for insertion")
        logger.debug(f"First document ID: {doc_ids[0] if doc_ids else 'No documents'}")
        logger.debug(f"First document length: {len(texts[0]) if texts else 0} characters")
        
        collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=doc_ids
        )
        logger.info(f"Successfully added all documents to collection '{collection_name}'")
        return True
    except Exception as e:
        logger.error(f"Error storing pages in ChromaDB collection {collection_name}: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        if hasattr(e, '__cause__') and e.__cause__:
            logger.error(f"Caused by: {str(e.__cause__)}")
        return False

def save_text_to_file(text: str, original_filename: str) -> str:
    """Save extracted text to a file with timestamp."""
    logger.info(f"Saving extracted text to file for: {original_filename}")
    try:
        output_dir = "extracted_texts"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_filename = os.path.splitext(os.path.basename(original_filename))[0]
        output_filename = f"{base_filename}_{timestamp}.txt"
        output_path = os.path.join(output_dir, output_filename)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        
        logger.info(f"Successfully saved text to: {output_path}")
        return output_path
    except Exception as e:
        logger.error(f"Failed to save text to file: {str(e)}")
        raise

def query_collection(collection_name: str, query: str, n_results: int = 5) -> List[str]:
    """Query a ChromaDB collection and return the top N matching documents' texts."""
    logger.info(f"Querying collection '{collection_name}' with query: {query}")
    try:
        collection = get_or_create_collection(collection_name)
        result = collection.query(query_texts=[query], n_results=n_results)
        # result['documents'] is a list of lists: [[doc1, doc2, ...]]
        documents = result.get('documents', [[]])[0]
        logger.info(f"Query successful. Found {len(documents)} results")
        return documents
    except Exception as e:
        logger.exception(f"Error querying collection {collection_name}: {e}")
        return []

def main():
    logger.info("Starting PDF processing script")
    if len(sys.argv) != 2:
        logger.error("Invalid number of arguments")
        print("Usage: python extract_text.py <path_to_pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        logger.error(f"File does not exist: {pdf_path}")
        print(f"Error: File '{pdf_path}' does not exist")
        sys.exit(1)
    
    if not pdf_path.lower().endswith('.pdf'):
        logger.error(f"File is not a PDF: {pdf_path}")
        print("Error: File must be a PDF")
        sys.exit(1)
    
    logger.info(f"Processing PDF: {pdf_path}")
    
    # Extract pages
    pages = extract_pages_from_pdf(pdf_path)
    if not pages:
        logger.error("Failed to extract text from PDF")
        print("Failed to extract text from PDF")
        sys.exit(1)
    
    # Combine all pages for file output
    combined_text = "\n\n\n".join(text for _, text in pages)
    
    # Save to file
    output_path = save_text_to_file(combined_text, pdf_path)
    logger.info(f"Text extraction complete. Output saved to: {output_path}")
    print(f"\nText extracted successfully!")
    print(f"Output saved to: {output_path}")
    print(f"Text length: {len(combined_text)} characters")
    
    # Store in ChromaDB
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    collection_name = "background_info"  # You can change this or make it configurable
    if store_pages_in_chroma(pages, pdf_name, collection_name):
        logger.info(f"Successfully stored pages in ChromaDB collection '{collection_name}'")
        print(f"Successfully stored pages in ChromaDB collection '{collection_name}'")
    else:
        logger.error(f"Failed to store pages in ChromaDB collection '{collection_name}'")
        print(f"Failed to store pages in ChromaDB collection '{collection_name}'")
    
    # Print preview
    preview = combined_text[:500].replace('\n', ' ')
    logger.info("Script execution completed successfully")
    print(f"\nPreview of extracted text:\n{preview}...")

if __name__ == "__main__":
    main()


#python3 extract_text.py "dnd_essentials_rulebook (2).pdf"
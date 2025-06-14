import pdfplumber
import sys
import os
from datetime import datetime
import re

def clean_text(text: str) -> str:
    """Clean up extracted text by removing CID codes and normalizing spaces."""
    # Remove CID codes
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Remove multiple spaces and normalize newlines
    text = ' '.join(text.split())
    
    # Remove any remaining control characters
    text = ''.join(char for char in text if ord(char) >= 32 or char == '\n')
    
    return text

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using pdfplumber."""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                try:
                    # Try different extraction methods
                    page_text = page.extract_text()
                    if not page_text or len(page_text.strip()) < 10:  # If text seems too short
                        # Try alternative extraction
                        page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                    
                    if page_text:
                        text += page_text + "\n\n\n"
                except Exception as e:
                    print(f"Warning: Error extracting text from page {pdf.pages.index(page) + 1}: {str(e)}")
                    continue
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return None

def save_text_to_file(text: str, original_filename: str) -> str:
    """Save extracted text to a file with timestamp."""
    # Create output directory if it doesn't exist
    output_dir = "extracted_texts"
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate output filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_filename = os.path.splitext(os.path.basename(original_filename))[0]
    output_filename = f"{base_filename}_{timestamp}.txt"
    output_path = os.path.join(output_dir, output_filename)
    
    # Clean the text before saving
    cleaned_text = clean_text(text)
    
    # Save text to file with UTF-8 encoding
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(cleaned_text)
    
    return output_path

def main():
    if len(sys.argv) != 2:
        print("Usage: python extract_text.py <path_to_pdf>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: File '{pdf_path}' does not exist")
        sys.exit(1)
    
    if not pdf_path.lower().endswith('.pdf'):
        print("Error: File must be a PDF")
        sys.exit(1)
    
    print(f"Processing PDF: {pdf_path}")
    text = extract_text_from_pdf(pdf_path)
    
    if text:
        output_path = save_text_to_file(text, pdf_path)
        print(f"\nText extracted successfully!")
        print(f"Output saved to: {output_path}")
        print(f"Text length: {len(text)} characters")
        
        # Print first 500 characters as preview
        preview = text[:500].replace('\n', ' ')
        print(f"\nPreview of extracted text:\n{preview}...")
    else:
        print("Failed to extract text from PDF")

if __name__ == "__main__":
    main() 


#python3 extract_text.py "dnd_essentials_rulebook (2).pdf"
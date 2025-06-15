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

def process_pdf_bytes(content: bytes, pdf_name: str, collection_name: str):
    try:
        pages = extract_pages_from_pdf(io.BytesIO(content))
        if not pages:
            logger.error(f"Failed to extract text from PDF {pdf_name}")
            return False
        if store_pages_in_chroma(pages, pdf_name, collection_name):
            logger.info(f"Stored {len(pages)} pages from '{pdf_name}' into collection '{collection_name}'")
            return True
        else:
            logger.error(f"Failed to store pages from '{pdf_name}'")
            return False
    except Exception as e:
        logger.exception(f"Error processing PDF {pdf_name}: {e}")
        return False

def clean_text(text: str) -> str:
    """Clean up extracted text by removing CID codes and normalizing spaces."""
    # Remove CID codes
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Remove multiple spaces and normalize newlines
    text = ' '.join(text.split())
    
    # Remove any remaining control characters
    text = ''.join(char for char in text if ord(char) >= 32 or char == '\n')
    
    return text

def extract_pages_from_pdf(pdf_source) -> List[Tuple[int, str]]:
    """
    Extract text from each page of a PDF file.
    pdf_source can be a path (str/Path) or a file-like object containing bytes.
    Returns a list of tuples containing (page_number, cleaned_text).
    """
    try:
        with pdfplumber.open(pdf_source) as pdf:
            pages = []
            for page_num, page in enumerate(pdf.pages, 1):
                try:
                    # Try different extraction methods
                    page_text = page.extract_text()
                    if not page_text or len(page_text.strip()) < 10:  # If text seems too short
                        # Try alternative extraction
                        page_text = page.extract_text(x_tolerance=3, y_tolerance=3)
                    
                    if page_text:
                        # Clean the page text
                        cleaned_page_text = clean_text(page_text)
                        cleaned_page_text += f"\nPage Number: {page_num}"
                        pages.append((page_num, cleaned_page_text))
                except Exception as e:
                    print(f"Warning: Error extracting text from page {page_num}: {str(e)}")
                    continue
            return pages
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return []

def get_chroma_client():
    """Get a ChromaDB client instance."""
    return chromadb.Client(Settings(
        persist_directory="chroma_db",
        anonymized_telemetry=False
    ))

def get_embedding_function():
    """Get the Nomic embedding function."""
    return embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="nomic-ai/nomic-bert-2048",
		trust_remote_code=True
    )

def get_or_create_collection(collection_name: str):
    """Get an existing collection or create a new one."""
    client = get_chroma_client()
    embedding_function = get_embedding_function()
    
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"description": f"Collection for {collection_name}"},
        embedding_function=embedding_function
    )

def list_chroma_collections():
    """List all collections in ChromaDB."""
    client = get_chroma_client()
    return client.list_collections()

def delete_collection(collection_name: str) -> bool:
    """Delete a collection from ChromaDB."""
    try:
        client = get_chroma_client()
        client.delete_collection(collection_name)
        return True
    except Exception as e:
        print(f"Error deleting collection {collection_name}: {str(e)}")
        return False

def store_pages_in_chroma(pages: List[Tuple[int, str]], pdf_name: str, collection_name: str) -> bool:
    """
    Store extracted pages in a specified ChromaDB collection.
    Returns True if successful, False otherwise.
    """
    try:
        collection = get_or_create_collection(collection_name)
        
        # Prepare data for batch insertion
        page_nums = [page_num for page_num, _ in pages]
        texts = [text for _, text in pages]
        doc_ids = [f"{pdf_name}_page_{page_num}" for page_num in page_nums]
        
        metadatas = [{
            "page_number": page_num,
            "pdf_name": pdf_name,
            "timestamp": datetime.now().isoformat()
        } for page_num in page_nums]
        
        collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=doc_ids
        )
        return True
    except Exception as e:
        print(f"Error storing pages in ChromaDB collection {collection_name}: {str(e)}")
        return False

def save_text_to_file(text: str, original_filename: str) -> str:
    """Save extracted text to a file with timestamp."""
    output_dir = "extracted_texts"
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_filename = os.path.splitext(os.path.basename(original_filename))[0]
    output_filename = f"{base_filename}_{timestamp}.txt"
    output_path = os.path.join(output_dir, output_filename)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    
    return output_path

def query_collection(collection_name: str, query: str, n_results: int = 5) -> List[str]:
    """Query a ChromaDB collection and return the top N matching documents' texts."""
    try:
        collection = get_or_create_collection(collection_name)
        result = collection.query(query_texts=[query], n_results=n_results)
        # result['documents'] is a list of lists: [[doc1, doc2, ...]]
        documents = result.get('documents', [[]])[0]
        return documents
    except Exception as e:
        logger.exception(f"Error querying collection {collection_name}: {e}")
        return []

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
    
    # Extract pages
    pages = extract_pages_from_pdf(pdf_path)
    if not pages:
        print("Failed to extract text from PDF")
        sys.exit(1)
    
    # Combine all pages for file output
    combined_text = "\n\n\n".join(text for _, text in pages)
    
    # Save to file
    output_path = save_text_to_file(combined_text, pdf_path)
    print(f"\nText extracted successfully!")
    print(f"Output saved to: {output_path}")
    print(f"Text length: {len(combined_text)} characters")
    
    # Store in ChromaDB
    pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
    collection_name = "background_info"  # You can change this or make it configurable
    if store_pages_in_chroma(pages, pdf_name, collection_name):
        print(f"Successfully stored pages in ChromaDB collection '{collection_name}'")
    else:
        print(f"Failed to store pages in ChromaDB collection '{collection_name}'")
    
    # Print preview
    preview = combined_text[:500].replace('\n', ' ')
    print(f"\nPreview of extracted text:\n{preview}...")

if __name__ == "__main__":
    main()


#python3 extract_text.py "dnd_essentials_rulebook (2).pdf"
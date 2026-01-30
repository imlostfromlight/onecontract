"""
AI Document Summarizer Module

Uses Groq API to analyze documents and extract:
- Key points
- Suspicious or risky clauses
"""

import os
import logging
import json
from django.conf import settings

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path):
    """
    Extract text content from a PDF file.
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        Extracted text as a string
    """
    try:
        from pypdf import PdfReader
        
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except ImportError:
        logger.error("pypdf is not installed. Run: pip install pypdf")
        raise Exception("PDF processing library not available")
    except Exception as e:
        logger.error(f"Failed to extract text from PDF: {e}")
        raise


def extract_text_from_docx(file_path):
    """
    Extract text content from a DOCX file.
    
    Args:
        file_path: Path to the DOCX file
        
    Returns:
        Extracted text as a string
    """
    try:
        import docx
        
        doc = docx.Document(file_path)
        text = []
        for paragraph in doc.paragraphs:
            text.append(paragraph.text)
        return '\n'.join(text).strip()
    except ImportError:
        logger.error("python-docx is not installed. Run: pip install python-docx")
        raise Exception("DOCX processing library not available")
    except Exception as e:
        logger.error(f"Failed to extract text from DOCX: {e}")
        raise


def extract_text(file_path):
    """
    Extract text from a file based on its extension.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Extracted text as a string
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ['.docx', '.doc']:
        # Note: python-docx only supports .docx, not .doc
        if ext == '.doc':
             logger.warning("Old .doc format not fully supported, trying docx reader which might fail")
        return extract_text_from_docx(file_path)
    elif ext == '.txt':
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    else:
        # Try to read as plain text for other formats or fail
        logger.warning(f"Unsupported file extension: {ext}, trying text")
        try:
             with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except:
             raise Exception(f"Unsupported file format: {ext}")


def summarize_document(text, max_length=15000):
    """
    Use Groq API to summarize a document and identify suspicious clauses.
    
    Args:
        text: Document text content
        max_length: Maximum characters to send to API (to avoid token limits)
        
    Returns:
        dict with 'key_points' and 'suspicious_clauses' lists
    """
    try:
        from groq import Groq
    except ImportError:
        logger.error("groq is not installed. Run: pip install groq")
        raise Exception("Groq library not available")
    
    api_key = getattr(settings, 'GROQ_API_KEY', '') or os.environ.get('GROQ_API_KEY', '')
    
    if not api_key:
        raise Exception("Groq API key is not configured")
    
    # Truncate text if too long
    if len(text) > max_length:
        text = text[:max_length] + "... [truncated]"
    
    if not text.strip():
        return {
            'key_points': ['Document appears to be empty or contains no readable text'],
            'suspicious_clauses': []
        }
    
    # Configure Groq
    client = Groq(api_key=api_key)
    
    prompt = f"""Analyze the following document and provide:
1. KEY POINTS: A list of the main points and important terms of this document (5-10 bullet points)
2. SUSPICIOUS CLAUSES: Any clauses that might be concerning, unfair, or require careful attention before signing (if any)

Be concise and focus on what matters for someone about to sign this document.

Document text:
{text}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{{
    "key_points": ["point 1", "point 2"],
    "suspicious_clauses": ["clause 1 description", "clause 2 description"]
}}

If there are no suspicious clauses, return an empty array for suspicious_clauses.
Respond in the same language as the document."""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = chat_completion.choices[0].message.content
        
        # Parse JSON response
        try:
            # Clean up response - remove markdown code blocks if present
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            result = json.loads(content.strip())
            return {
                'key_points': result.get('key_points', []),
                'suspicious_clauses': result.get('suspicious_clauses', [])
            }
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw content as a key point
            logger.warning(f"Failed to parse Gemini response as JSON: {content}")
            return {
                'key_points': [content],
                'suspicious_clauses': []
            }
            
    except Exception as e:
        logger.error(f"Groq API call failed: {e}")
        raise Exception(f"Failed to analyze document: {str(e)}")

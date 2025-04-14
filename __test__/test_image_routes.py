import requests
import os
import sys
import pytest
from pathlib import Path
from io import BytesIO
from PIL import Image
from unittest.mock import patch, MagicMock

# Add the parent directory to sys.path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import app for testing
import app

def test_image_routes():
    """Test that the image routes in the Flask app are working correctly."""
    print("Testing image routes...")
    
    # Base URL of your running Flask app
    base_url = "http://localhost:5000"
    
    # Test a few known images from the avatars directory
    test_paths = [
        "/images/avatars/gm.png",
        "/ui/public/images/avatars/gm.png"
    ]
    
    # Create a directory to save test downloads
    test_dir = Path("test_downloads")
    test_dir.mkdir(exist_ok=True)
    
    results = {}
    
    for path in test_paths:
        url = f"{base_url}{path}"
        print(f"Testing URL: {url}")
        
        try:
            response = requests.get(url, timeout=5)
            status = response.status_code
            
            if status == 200:
                # Save the file to verify it downloaded correctly
                filename = os.path.basename(path)
                file_path = test_dir / filename
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                size = len(response.content)
                results[path] = f"SUCCESS - Status: {status}, Size: {size} bytes, Saved to: {file_path}"
            else:
                results[path] = f"FAILED - Status: {status}"
        except Exception as e:
            results[path] = f"ERROR - {str(e)}"
    
    # Print results
    print("\nResults:")
    for path, result in results.items():
        print(f"{path}: {result}")

if __name__ == "__main__":
    test_image_routes() 
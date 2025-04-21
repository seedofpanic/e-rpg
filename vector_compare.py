import numpy as np
from sentence_transformers import SentenceTransformer

cache = {}

model = SentenceTransformer('all-MiniLM-L6-v2')

def compare_with_base(base_phrase, input_text):
    base_embedding = cache.get(base_phrase)
    input_embedding = cache.get(input_text)

    if base_embedding is None:
        base_embedding = model.encode(base_phrase, convert_to_tensor=False)
        base_embedding = base_embedding / np.linalg.norm(base_embedding)
        cache[base_phrase] = base_embedding

    if input_embedding is None:
        input_embedding = model.encode(input_text, convert_to_tensor=False)
        input_embedding = input_embedding / np.linalg.norm(input_embedding)
        cache[input_text] = input_embedding
    
    # Calculate cosine similarity directly
    cosine_similarity = np.dot(base_embedding, input_embedding)
    
    return cosine_similarity
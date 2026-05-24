from langchain_groq import ChatGroq
from config.settings import GROQ_API_KEY, MODEL_NAME

def get_llm():
    return ChatGroq(
        model=MODEL_NAME,
        api_key=GROQ_API_KEY,
    )
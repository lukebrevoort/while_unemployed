"""
Quick test for OpenAI TTS functionality
"""
import openai
import os
import base64
from dotenv import load_dotenv

load_dotenv()

def test_tts():
    """Test OpenAI TTS API"""
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    test_text = "Hi! Let's work on Two Sum. Take a moment to read the problem."
    
    print(f"Converting text to speech: '{test_text}'")
    
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=test_text,
            response_format="mp3"
        )
        
        audio_bytes = response.content
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        print(f"✓ TTS successful! Generated {len(audio_bytes)} bytes of audio")
        print(f"✓ Base64 length: {len(audio_base64)} characters")
        
        # Save a test file to verify
        with open("test_tts_output.mp3", "wb") as f:
            f.write(audio_bytes)
        print(f"✓ Saved test audio to test_tts_output.mp3")
        
        return True
    except Exception as e:
        print(f"✗ TTS failed: {e}")
        return False

if __name__ == "__main__":
    success = test_tts()
    exit(0 if success else 1)

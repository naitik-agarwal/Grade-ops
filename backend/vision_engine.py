import os
from dotenv import load_dotenv
load_dotenv() # Load the hidden keys
from google import genai
from PIL import Image
import sys

class CloudVisionEngine:
    def __init__(self):
        # The Nuclear Option: Google Gemini via the brand new SDK
        # Your token is hardcoded right here
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # We are using Gemini 2.5 Flash - their absolute latest and fastest vision model
        self.model_id = "gemini-2.5-flash"
        print("☁️ Cloud Vision Engine Initialized. Connecting to Gemini Supercluster...\n")

    def extract_text(self, image_path: str) -> str:
        print(f"📡 Sending '{image_path}' to Gemini for OCR...")
        
        try:
            # Gemini natively handles the raw image file, no Base64 required!
            img = Image.open(image_path)
        except FileNotFoundError:
            print(f"❌ Error: Could not find '{image_path}'. Make sure it is in the main folder!")
            sys.exit(1)

        prompt = "Extract and transcribe all the handwritten text and math formulas from this image exactly as written. Output only the transcribed text. Do not add any conversational filler."

        try:
            # The new SDK syntax for sending an image and a prompt together
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[img, prompt]
            )
            return response.text
        except Exception as e:
            return f"❌ API Error: {str(e)}"

# --- Test the Engine ---
if __name__ == "__main__":
    engine = CloudVisionEngine()
    
    # Make sure 'test_exam.png' is in the main GRADEOPS folder!
    result = engine.extract_text("test_exam.png") 
    
    print("\n" + "="*40)
    print("        EXTRACTION RESULT")
    print("="*40)
    print(result)
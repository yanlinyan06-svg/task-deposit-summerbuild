from fastapi import FastAPI, UploadFile, File
import shutil
import base64
import os
from reka.client import Reka

# 1. Setup Reka AI
client = Reka(api_key="REKA_API_KEY")

app = FastAPI()

@app.get("/ping")
def ping_server():
    return {"status": "success", "message": "The Reka backend is awake!"}

# Helper function to turn the image into text for Reka
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

@app.post("/upload-task")
async def upload_task(file: UploadFile = File(...)):
    # 2. Save the image from the phone
    file_location = f"saved_{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # 3. Translate the image to Base64
        base64_image = encode_image(file_location)
        
        prompt = """
        The user was asked to complete a productivity task to unlock their social media.
        The task was: "Write out the formula for the Krebs Cycle and snap a photo."
        
        Look at this uploaded image. Is the user making a legitimate attempt at this task?
        - If it is a photo of handwritten notes, chemistry, or biology concepts, it is VALID.
        - If it is a photo of a blank floor, a ceiling, a random household object, or a blank piece of paper, it is RUBBISH.
        
        Respond ONLY with a valid JSON format like this: 
        {"valid": true, "reason": "Shows handwritten notes regarding the Krebs cycle."}
        or 
        {"valid": false, "reason": "This is just a picture of a keyboard."}
        """

        print("Sending to Reka AI...")
        
        # 4. Ask Reka to evaluate the image using the reka-flash model
        response = client.chat.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        # We attach the base64 image data directly into the message
                        {"type": "image_url", "image_url": f"data:image/jpeg;base64,{base64_image}"}
                    ]
                }
            ],
            model="reka-flash"
        )
        
        # Extract Reka's text response
        ai_reply = response.responses[0].message.content
        print("Reka says:", ai_reply)

        # 5. Clean up the temporary file
        os.remove(file_location)
        
        # 6. Send the verdict back to the phone
        return {"status": "success", "message": ai_reply}

    except Exception as e:
        print("Error:", str(e))
        return {"status": "error", "message": "Failed to connect to Reka AI."}

from pypdf import PdfReader
import json

@app.post("/generate-tasks")
async def generate_tasks(file: UploadFile = File(...)):
    try:
        # 1. Rip the text from the uploaded PDF
        pdf_reader = PdfReader(file.file)
        text = ""
        
        # We only read the first 5 pages to keep it fast and save AI tokens!
        for page in pdf_reader.pages[:5]:
            text += page.extract_text() + "\n"

        # 2. The AI Tutor Prompt
        prompt = f"""
        You are an expert tutor. Read these lecture notes and generate exactly 3 short, specific questions to test the student's knowledge.
        The questions should be something they can write down on a piece of paper.
        
        Respond ONLY with a valid JSON array of strings. 
        Example: ["What is the powerhouse of the cell?", "Define osmosis.", "What is the Krebs Cycle?"]
        
        Lecture Notes:
        {text}
        """

        print("Reading PDF and asking Reka...")
        
        # 3. Ask Reka AI
        response = client.chat.create(
            messages=[
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}]
                }
            ],
            model="reka-flash"
        )
        
        # 4. Send the questions back to the phone
        ai_reply = response.responses[0].message.content
        return {"status": "success", "questions": ai_reply}

    except Exception as e:
        print("Error:", str(e))
        return {"status": "error", "message": "Could not read the PDF or contact AI."}

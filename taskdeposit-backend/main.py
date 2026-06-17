import base64
import json
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from reka.client import Reka

REKA_MODEL = os.getenv("REKA_MODEL", "reka-flash")
REKA_API_KEY = os.getenv("REKA_API_KEY")

client = Reka(api_key=REKA_API_KEY) if REKA_API_KEY else None

app = FastAPI(title="Task Deposit API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEMO_QUESTIONS = [
    "Explain the role of NADH in the Krebs cycle in three sentences.",
    "Solve: 3x + 7 = 31, and show each algebra step.",
    "Draw a labeled flow of glycolysis into the Krebs cycle.",
]


def encode_image(image_path: Path) -> str:
    with image_path.open("rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def reka_text(prompt: str) -> str:
    if client is None:
        return json.dumps(DEMO_QUESTIONS)

    response = client.chat.create(
        messages=[{"role": "user", "content": prompt}],
        model=REKA_MODEL,
    )
    return response.responses[0].message.content


@app.get("/ping")
def ping_server():
    return {
        "status": "success",
        "message": "Task Deposit backend is awake.",
        "ai_configured": client is not None,
    }


@app.post("/generate-tasks")
async def generate_tasks(file: UploadFile = File(...)):
    filename = file.filename or "uploaded material"
    raw_sample = await file.read(12000)
    text_sample = raw_sample.decode("utf-8", errors="ignore").strip()

    prompt = f"""
    You generate lock-screen study prompts for a productivity app.
    The student uploaded: {filename}

    Use this extracted sample if it contains useful text:
    {text_sample[:6000]}

    Return ONLY a JSON array of 3 concise questions. Each question should be answerable
    in 2-5 minutes and should work for typed or handwritten responses.
    """

    try:
        questions = reka_text(prompt)
        return {"status": "success", "questions": questions}
    except Exception as exc:
        print("generate-tasks error:", exc)
        return {
            "status": "success",
            "questions": json.dumps(DEMO_QUESTIONS),
            "message": "Using demo questions because AI generation failed.",
        }


@app.post("/upload-task")
async def upload_task(
    file: UploadFile = File(...),
    task: str = Form("Write a visible attempt at the assigned study task."),
):
    suffix = Path(file.filename or "proof.jpg").suffix or ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write(await file.read())

    try:
        if client is None:
            return {
                "status": "success",
                "message": json.dumps(
                    {
                        "valid": True,
                        "reason": "Demo mode: backend is reachable. Add REKA_API_KEY for visual verification.",
                    }
                ),
            }

        base64_image = encode_image(temp_path)
        prompt = f"""
        The user is trying to unlock a distracting app by depositing proof of work.
        Assigned task: "{task}"

        Inspect the uploaded image. The answer does NOT need to be correct. It only
        needs to look like a real attempt: handwritten notes, diagrams, equations,
        typed work, highlighted material, or relevant study content.

        Mark invalid if it is a blank page, random object, floor, ceiling, selfie,
        screenshot unrelated to studying, intentionally obscured image, or obvious spam.

        Respond ONLY as JSON:
        {{"valid": true, "reason": "short reason"}}
        """

        response = client.chat.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": f"data:image/jpeg;base64,{base64_image}"},
                    ],
                }
            ],
            model=REKA_MODEL,
        )

        return {"status": "success", "message": response.responses[0].message.content}
    except Exception as exc:
        print("upload-task error:", exc)
        return {
            "status": "error",
            "message": json.dumps(
                {
                    "valid": False,
                    "reason": "Failed to connect to Reka AI. Check REKA_API_KEY and backend logs.",
                }
            ),
        }
    finally:
        temp_path.unlink(missing_ok=True)

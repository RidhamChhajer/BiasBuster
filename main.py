from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import os
from dotenv import load_dotenv
import httpx
import json
from supabase import create_client, Client
from openai import OpenAI
import jwt
from passlib.context import CryptContext
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
import logging

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="BiasBuster API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-here")
JWT_ALGORITHM = "HS256"

# Pydantic models
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    chatId: str
    message: str
    fileUrl: Optional[str] = None

class ReportDownloadRequest(BaseModel):
    reportId: str
    format: str  # "pdf" or "json"

class UserResponse(BaseModel):
    id: str
    username: str
    email: str

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

class BiasReport(BaseModel):
    bias_detected: bool
    reasons: List[str]
    fixes: List[str]

class Message(BaseModel):
    role: str  # "user" or "ai"
    content: str
    timestamp: str

class ChatResponse(BaseModel):
    reply: str
    report: BiasReport
    updatedChat: Dict[str, Any]

# Helper functions
def verify_token(authorization: str):
    """Verify JWT token and return user data"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(authorization: str = None):
    """Dependency to get current user from token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    return verify_token(authorization)

async def detect_bias_with_gpt(message: str, file_content: Optional[str] = None) -> tuple[str, BiasReport]:
    """Use GPT-4o-mini to generate response and detect bias"""
    try:
        # Prepare the full message
        full_message = message
        if file_content:
            full_message = f"{message}\n\nFile content:\n{file_content[:5000]}"  # Limit file content
        
        # System prompt for bias detection
        system_prompt = """You are BiasBuster, an AI assistant that detects bias in datasets, AI models, and text.
Your task is to:
1. Respond naturally to the user's query
2. Analyze the content for potential bias
3. Return your analysis in the following JSON format at the end of your response:

---BIAS_REPORT_START---
{
    "bias_detected": true/false,
    "reasons": ["reason1", "reason2"],
    "fixes": ["fix1", "fix2"]
}
---BIAS_REPORT_END---

Types of bias to check for:
- Gender bias
- Racial/ethnic bias
- Age bias
- Socioeconomic bias
- Cultural bias
- Selection bias
- Confirmation bias
- Sampling bias
- Algorithmic bias
"""

        # Call OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": full_message}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        full_response = response.choices[0].message.content
        
        # Extract bias report from response
        bias_report = BiasReport(
            bias_detected=False,
            reasons=[],
            fixes=[]
        )
        
        if "---BIAS_REPORT_START---" in full_response and "---BIAS_REPORT_END---" in full_response:
            report_start = full_response.find("---BIAS_REPORT_START---") + len("---BIAS_REPORT_START---")
            report_end = full_response.find("---BIAS_REPORT_END---")
            report_json = full_response[report_start:report_end].strip()
            
            try:
                report_data = json.loads(report_json)
                bias_report = BiasReport(**report_data)
                # Remove the bias report from the response
                reply = full_response[:full_response.find("---BIAS_REPORT_START---")].strip()
            except:
                reply = full_response
        else:
            reply = full_response
        
        return reply, bias_report
        
    except Exception as e:
        logger.error(f"Error in bias detection: {str(e)}")
        return "I encountered an error while processing your request.", BiasReport(
            bias_detected=False,
            reasons=["Error in processing"],
            fixes=["Please try again"]
        )

# Auth endpoints
@app.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """User signup endpoint"""
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "username": request.username
                }
            }
        })
        
        if auth_response.user:
            # Generate JWT token
            token_payload = {
                "user_id": auth_response.user.id,
                "email": auth_response.user.email,
                "username": request.username
            }
            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            return AuthResponse(
                user=UserResponse(
                    id=auth_response.user.id,
                    username=request.username,
                    email=auth_response.user.email
                ),
                token=token
            )
        else:
            raise HTTPException(status_code=400, detail="Signup failed")
            
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """User login endpoint"""
    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user:
            # Get username from user metadata
            username = auth_response.user.user_metadata.get("username", "User")
            
            # Generate JWT token
            token_payload = {
                "user_id": auth_response.user.id,
                "email": auth_response.user.email,
                "username": username
            }
            token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            return AuthResponse(
                user=UserResponse(
                    id=auth_response.user.id,
                    username=username,
                    email=auth_response.user.email
                ),
                token=token
            )
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/me", response_model=Dict[str, UserResponse])
async def get_me(authorization: str = Depends(get_current_user)):
    """Get current user info"""
    user_data = authorization
    return {
        "user": UserResponse(
            id=user_data["user_id"],
            username=user_data["username"],
            email=user_data["email"]
        )
    }

# Chat endpoints
@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user=Depends(get_current_user)):
    """Process chat message with bias detection"""
    try:
        # Get file content if URL provided
        file_content = None
        if request.fileUrl:
            # Download file content from Supabase storage
            try:
                # Extract file path from URL
                file_path = request.fileUrl.split("/storage/v1/object/public/")[1]
                response = supabase.storage.from_("uploads").download(file_path)
                file_content = response.decode('utf-8', errors='ignore')
            except Exception as e:
                logger.error(f"Error downloading file: {str(e)}")
                file_content = "Error reading file content"
        
        # Get AI response and bias report
        ai_reply, bias_report = await detect_bias_with_gpt(request.message, file_content)
        
        # Get existing chat or create new one
        chat_response = supabase.table("chats").select("*").eq("id", request.chatId).execute()
        
        timestamp = datetime.utcnow().isoformat()
        new_messages = []
        
        if chat_response.data:
            # Update existing chat
            existing_messages = chat_response.data[0].get("messages", [])
            new_messages = existing_messages + [
                {"role": "user", "content": request.message, "timestamp": timestamp},
                {"role": "ai", "content": ai_reply, "timestamp": timestamp}
            ]
            
            supabase.table("chats").update({
                "messages": new_messages,
                "last_message": request.message,
                "updated_at": timestamp
            }).eq("id", request.chatId).execute()
        else:
            # Create new chat
            new_messages = [
                {"role": "user", "content": request.message, "timestamp": timestamp},
                {"role": "ai", "content": ai_reply, "timestamp": timestamp}
            ]
            
            supabase.table("chats").insert({
                "id": request.chatId,
                "user_id": user["user_id"],
                "messages": new_messages,
                "last_message": request.message,
                "created_at": timestamp,
                "updated_at": timestamp
            }).execute()
        
        # Store report if bias detected
        if bias_report.bias_detected:
            report_id = str(uuid.uuid4())
            supabase.table("reports").insert({
                "id": report_id,
                "user_id": user["user_id"],
                "chat_id": request.chatId,
                "bias_detected": bias_report.bias_detected,
                "reasons": bias_report.reasons,
                "fixes": bias_report.fixes,
                "created_at": timestamp
            }).execute()
        
        return ChatResponse(
            reply=ai_reply,
            report=bias_report,
            updatedChat={
                "id": request.chatId,
                "messages": new_messages
            }
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/new")
async def new_chat(user=Depends(get_current_user)):
    """Create a new chat session"""
    chat_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    try:
        supabase.table("chats").insert({
            "id": chat_id,
            "user_id": user["user_id"],
            "messages": [],
            "created_at": timestamp,
            "updated_at": timestamp
        }).execute()
        
        return {"chatId": chat_id}
        
    except Exception as e:
        logger.error(f"New chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/chat/{chat_id}")
async def delete_chat(chat_id: str, user=Depends(get_current_user)):
    """Delete a chat session"""
    try:
        # Verify chat belongs to user
        chat_response = supabase.table("chats").select("user_id").eq("id", chat_id).execute()
        
        if not chat_response.data:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if chat_response.data[0]["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Delete associated reports first
        supabase.table("reports").delete().eq("chat_id", chat_id).execute()
        
        # Delete chat
        supabase.table("chats").delete().eq("id", chat_id).execute()
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(user=Depends(get_current_user)):
    """Get user's chat history"""
    try:
        response = supabase.table("chats").select(
            "id, last_message, created_at"
        ).eq("user_id", user["user_id"]).order("updated_at", desc=True).execute()
        
        history = []
        for chat in response.data:
            history.append({
                "chatId": chat["id"],
                "lastMessage": chat.get("last_message", "New chat"),
                "createdAt": chat["created_at"]
            })
        
        return history
        
    except Exception as e:
        logger.error(f"History error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Report endpoints
@app.post("/api/report/download")
async def download_report(request: ReportDownloadRequest, user=Depends(get_current_user)):
    """Download report in PDF or JSON format"""
    try:
        # Get report data
        report_response = supabase.table("reports").select("*").eq("id", request.reportId).execute()
        
        if not report_response.data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report = report_response.data[0]
        
        # Verify report belongs to user
        if report["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        if request.format == "json":
            # Return JSON file
            json_content = json.dumps({
                "report_id": report["id"],
                "created_at": report["created_at"],
                "bias_detected": report["bias_detected"],
                "reasons": report["reasons"],
                "fixes": report["fixes"]
            }, indent=2)
            
            return StreamingResponse(
                io.StringIO(json_content),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=bias_report_{report['id']}.json"
                }
            )
        
        elif request.format == "pdf":
            # Generate PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            story.append(Paragraph("Bias Detection Report", styles['Title']))
            story.append(Spacer(1, 12))
            
            # Report ID and Date
            story.append(Paragraph(f"Report ID: {report['id']}", styles['Normal']))
            story.append(Paragraph(f"Date: {report['created_at']}", styles['Normal']))
            story.append(Spacer(1, 12))
            
            # Bias Detection Result
            status = "Bias Detected" if report["bias_detected"] else "No Bias Detected"
            story.append(Paragraph(f"Status: {status}", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            # Reasons
            if report["reasons"]:
                story.append(Paragraph("Reasons:", styles['Heading3']))
                for reason in report["reasons"]:
                    story.append(Paragraph(f"• {reason}", styles['Normal']))
                story.append(Spacer(1, 12))
            
            # Fixes
            if report["fixes"]:
                story.append(Paragraph("Recommended Fixes:", styles['Heading3']))
                for fix in report["fixes"]:
                    story.append(Paragraph(f"• {fix}", styles['Normal']))
            
            doc.build(story)
            buffer.seek(0)
            
            return StreamingResponse(
                buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=bias_report_{report['id']}.pdf"
                }
            )
        
        else:
            raise HTTPException(status_code=400, detail="Invalid format")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download report error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Upload endpoint
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Upload file to Supabase storage"""
    try:
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
        unique_filename = f"{user['user_id']}/{uuid.uuid4()}.{file_extension}"
        
        # Read file content
        file_content = await file.read()
        
        # Upload to Supabase storage
        response = supabase.storage.from_("uploads").upload(
            unique_filename,
            file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        file_url = supabase.storage.from_("uploads").get_public_url(unique_filename)
        
        return {
            "fileUrl": file_url,
            "fileName": file.filename,
            "fileSize": len(file_content)
        }
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check
@app.get("/")
async def root():
    return {"message": "BiasBuster API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

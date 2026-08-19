from fastapi import APIRouter, HTTPException, Depends
from backend.schemas.auth import UserLogin, UserSignup, TokenResponse
from backend.database.connection import supabase
from backend.utils.security import get_current_user
from typing import Dict

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup")
def signup_agent(payload: UserSignup):
    """Signs up a new agent using Supabase Auth and triggers database profile mapping."""
    try:
        res = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {
                "data": {
                    "name": payload.name
                }
            }
        })
        if not res.user:
            raise HTTPException(status_code=400, detail="Signup failed.")
        return {"message": "Signup successful. Verification email dispatched.", "user_id": res.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
def login_agent(payload: UserLogin):
    """Logs in an agent using Supabase and returns the session access token."""
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        if not res.session:
            raise HTTPException(status_code=400, detail="Login failed.")
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.get("/me")
def get_me(current_user = Depends(get_current_user)):
    """Validates the Authorization token and returns active profile info."""
    try:
        # Retrieve detailed profile data from the public.users table
        res = supabase.table("users").select("*").eq("id", current_user.id).single().execute()
        if res.data:
            return res.data
        
        # Fallback to auth metadata if profile trigger is pending
        return {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.user_metadata.get("name", "Agent"),
            "clearance_level": "Level 4",
            "region": "IN-SOUTH"
        }
    except Exception as e:
        # Return fallback details
        return {
            "id": current_user.id,
            "email": current_user.email,
            "name": getattr(current_user, "email", "Agent").split("@")[0].capitalize(),
            "clearance_level": "Level 4",
            "region": "IN-SOUTH"
        }

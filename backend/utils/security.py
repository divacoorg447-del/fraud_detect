from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from backend.database.connection import supabase
from backend.config.settings import JWT_SECRET_KEY, JWT_ALGORITHM

security_bearer = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer)):
    token = credentials.credentials
    try:
        auth_res = supabase.auth.get_user(token)
        if auth_res and auth_res.user:
            return auth_res.user
    except Exception as e:
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            email = payload.get("sub")
            if email is None:
                raise HTTPException(status_code=401, detail="Invalid token credentials")
            # Create a mock-like user object matching Supabase Auth response properties
            from types import SimpleNamespace
            return SimpleNamespace(email=email, id=payload.get("id"))
        except JWTError:
            raise HTTPException(status_code=401, detail="Authentication failed. Token is invalid or expired.")
            
    raise HTTPException(status_code=401, detail="Invalid session or unauthorized access token.")

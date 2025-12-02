"""
Backend Client for AImee LiveKit Agent

HTTP client to communicate with the Node.js backend's multi-agent router.
This allows the LiveKit agent to route user input through the backend
instead of using direct OpenAI integration.
"""

import os
import logging
import json
import aiohttp
from typing import Optional, Dict, Any
from dataclasses import dataclass

# Configure logger
logger = logging.getLogger("backend-client")

@dataclass
class BackendResponse:
    """Response from backend multi-agent system"""
    success: bool
    agent: str
    response: str
    metadata: Dict[str, Any]
    error: Optional[str] = None

class BackendClient:
    """HTTP client for AImee backend multi-agent router"""

    def __init__(self):
        # Get backend configuration from environment
        self.backend_url = os.getenv("BACKEND_URL", "http://backend:3000")
        self.enabled = os.getenv("USE_BACKEND_ROUTER", "false").lower() == "true"
        self.timeout = int(os.getenv("BACKEND_TIMEOUT", "10"))

        # Session for connection pooling
        self._session: Optional[aiohttp.ClientSession] = None

        logger.info(f"Backend Client Configuration:")
        logger.info(f"  Backend URL: {self.backend_url}")
        logger.info(f"  Router Enabled: {self.enabled}")
        logger.info(f"  Timeout: {self.timeout}s")

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self):
        """Close HTTP session"""
        if self._session and not self._session.closed:
            await self._session.close()

    async def chat(
        self,
        user_id: str,
        user_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> BackendResponse:
        """
        Send user input to backend multi-agent router

        Args:
            user_id: Unique user identifier
            user_input: User's spoken/text input
            context: Additional context (location, preferences, etc.)

        Returns:
            BackendResponse with agent selection and response
        """
        if not self.enabled:
            return BackendResponse(
                success=False,
                agent="direct",
                response="",
                metadata={},
                error="Backend router is disabled"
            )

        try:
            session = await self._get_session()

            # Prepare request payload
            payload = {
                "userId": user_id,
                "input": user_input,
                "context": context or {}
            }

            logger.info(f"Backend Client: Sending request to {self.backend_url}/aimee-chat")
            logger.info(f"Backend Client: User input: {user_input[:100]}{'...' if len(user_input) > 100 else ''}")

            # Send request to backend
            async with session.post(
                f"{self.backend_url}/aimee-chat",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:

                if response.status == 200:
                    data = await response.json()

                    if data.get("success"):
                        backend_response = BackendResponse(
                            success=True,
                            agent=data.get("agent", "unknown"),
                            response=data.get("response", ""),
                            metadata=data.get("metadata", {})
                        )

                        logger.info(f"Backend Client: Success - Agent: {backend_response.agent}")
                        logger.info(f"Backend Client: Response: {backend_response.response[:100]}{'...' if len(backend_response.response) > 100 else ''}")

                        return backend_response
                    else:
                        error_msg = data.get("error", "Unknown backend error")
                        logger.error(f"Backend Client: Backend returned error: {error_msg}")

                        return BackendResponse(
                            success=False,
                            agent="error",
                            response="",
                            metadata={},
                            error=error_msg
                        )
                else:
                    error_msg = f"HTTP {response.status}: {await response.text()}"
                    logger.error(f"Backend Client: HTTP error: {error_msg}")

                    return BackendResponse(
                        success=False,
                        agent="error",
                        response="",
                        metadata={},
                        error=error_msg
                    )

        except aiohttp.ClientTimeout:
            error_msg = f"Request timeout after {self.timeout}s"
            logger.error(f"Backend Client: {error_msg}")

            return BackendResponse(
                success=False,
                agent="timeout",
                response="",
                metadata={},
                error=error_msg
            )

        except aiohttp.ClientError as e:
            error_msg = f"Network error: {str(e)}"
            logger.error(f"Backend Client: {error_msg}")

            return BackendResponse(
                success=False,
                agent="network_error",
                response="",
                metadata={},
                error=error_msg
            )

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Backend Client: {error_msg}")

            return BackendResponse(
                success=False,
                agent="unexpected_error",
                response="",
                metadata={},
                error=error_msg
            )

    async def arrival(
        self,
        user_id: str,
        marker_id: str,
        marker_name: str,
        location: Dict[str, float],
        mode: str = "drive"
    ) -> BackendResponse:
        """
        Send arrival event to backend for GPS-triggered narratives

        Args:
            user_id: Unique user identifier
            marker_id: ID of the historical marker
            marker_name: Human-readable name of the marker
            location: Dict with 'lat' and 'lng' coordinates
            mode: Transportation mode ('drive' or 'walk')

        Returns:
            BackendResponse with arrival narrative
        """
        if not self.enabled:
            return BackendResponse(
                success=False,
                agent="direct",
                response="",
                metadata={},
                error="Backend router is disabled"
            )

        try:
            session = await self._get_session()

            # Prepare request payload
            payload = {
                "userId": user_id,
                "markerId": marker_id,
                "markerName": marker_name,
                "location": location,
                "mode": mode
            }

            logger.info(f"Backend Client: Sending arrival to {self.backend_url}/aimee-arrival")
            logger.info(f"Backend Client: Marker: {marker_name} ({marker_id})")
            logger.info(f"Backend Client: Location: {location}, Mode: {mode}")

            # Send request to backend
            async with session.post(
                f"{self.backend_url}/aimee-arrival",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:

                if response.status == 200:
                    data = await response.json()

                    if data.get("success"):
                        backend_response = BackendResponse(
                            success=True,
                            agent=data.get("agent", "unknown"),
                            response=data.get("response", ""),
                            metadata=data.get("metadata", {})
                        )

                        logger.info(f"Backend Client: Arrival success - Agent: {backend_response.agent}")

                        return backend_response
                    else:
                        error_msg = data.get("error", "Unknown backend error")
                        logger.error(f"Backend Client: Arrival backend error: {error_msg}")

                        return BackendResponse(
                            success=False,
                            agent="error",
                            response="",
                            metadata={},
                            error=error_msg
                        )
                else:
                    error_msg = f"HTTP {response.status}: {await response.text()}"
                    logger.error(f"Backend Client: Arrival HTTP error: {error_msg}")

                    return BackendResponse(
                        success=False,
                        agent="error",
                        response="",
                        metadata={},
                        error=error_msg
                    )

        except Exception as e:
            error_msg = f"Arrival request error: {str(e)}"
            logger.error(f"Backend Client: {error_msg}")

            return BackendResponse(
                success=False,
                agent="arrival_error",
                response="",
                metadata={},
                error=error_msg
            )

    async def health_check(self) -> bool:
        """
        Check if backend is available and responding

        Returns:
            True if backend is healthy, False otherwise
        """
        try:
            session = await self._get_session()

            async with session.get(f"{self.backend_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("status") == "ok"

        except Exception as e:
            logger.warning(f"Backend Client: Health check failed: {e}")

        return False

# Global backend client instance
backend_client = BackendClient()
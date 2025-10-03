import React, { useState } from "react";

const FlipkartLogin = () => {
  const [username, setUsername] = useState("pvtraders2023@gmail.com");
  const [password, setPassword] = useState("Junnu@08");
  const [otp, setOtp] = useState("");
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState(null);
  const [sessionCookies, setSessionCookies] = useState(""); // NEW: store cookies here

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/flipkart-login-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Login request failed");
      }

      debugger;
      const data = await response.json();
      //EXTRACT COOKIES
      // const cookies = response.headers.get("set-cookie");
      console.log("Login Successful:", data);

      const rawCookies = response.headers.get("set-cookie"); // <-- Important point
      if (rawCookies) {
        setSessionCookies(rawCookies); // Save it for OTP request
        console.log("Captured cookies:", rawCookies);
      } else {
        console.warn("No cookies captured from login response");
      }

      setShowOtpBox(true);
    } catch (error) {
      console.error("Login Error:", error.message);
    }
  };

  const handleVerifyOtp = async () => {
    debugger;
    try {
      const response = await fetch("/api/flipkart-verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookies, // <-- Attach cookies
        },
        body: JSON.stringify({ otp }),
      });

      if (!response.ok) {
        throw new Error("OTP verification request failed");
      }

      const data = await response.json();
      console.log("OTP Verification Result:", data);

      if (data.code === 1000 && data.data) {
        setLoginSuccessData({
          name: data.data.name,
          businessName: data.data.businessName,
        });
      }
    } catch (error) {
      console.error("OTP Verification Error:", error.message);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "auto" }}>
      {!loginSuccessData ? (
        <>
          <h2>Flipkart Seller Login</h2>

          {!showOtpBox ? (
            <>
              <input
                type="email"
                placeholder="Username (email)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "10px", marginBottom: "20px" }}
              />
              <button
                onClick={handleLogin}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#007BFF",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  marginBottom: "20px",
                }}
              >
                Login
              </button>
            </>
          ) : (
            <>
              <h3>Enter OTP</h3>
              <input
                type="text"
                placeholder="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
              />
              <button
                onClick={handleVerifyOtp}
                style={{
                  width: "100%",
                  padding: "10px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Verify OTP
              </button>
            </>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>Welcome {loginSuccessData.name}!</h2>
          <p style={{ fontSize: "18px" }}>
            Business: <strong>{loginSuccessData.businessName}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default FlipkartLogin;

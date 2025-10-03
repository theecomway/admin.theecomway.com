export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { otp, cookie } = req.body; // ⚡ Get both OTP and Cookie from request

  if (!cookie) {
    return res.status(400).json({ message: "Missing session cookie" });
  }

  try {
    const verifyResponse = await fetch(
      "https://seller.flipkart.com/verifyOtp",
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Accept-Language": "en-GB,en;q=0.5",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Content-Type": "application/json",
          Origin: "https://seller.flipkart.com",
          Pragma: "no-cache",
          Referer: "https://seller.flipkart.com/",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          "Sec-GPC": "1",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
          "X-Requested-With": "XMLHttpRequest",
          "sec-ch-ua":
            '"Brave";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          Cookie: cookie, // ⚡ use cookie dynamically
        },
        body: JSON.stringify({ otp }),
      }
    );

    const data = await verifyResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "OTP Verification Failed" });
  }
}

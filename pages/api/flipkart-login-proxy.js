export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { username, password } = req.body;

  try {
    const flipkartRes = await fetch("https://seller.flipkart.com/login", {
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
        "sec-ch-ua": '"Brave";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
      },
      redirect: "manual", // don't follow redirects automatically
      body: JSON.stringify({
        authName: "flipkart",
        username,
        password,
        userNameType: "email",
      }),
    });

    const data = await flipkartRes.json();

    // Raw cookie header extraction
    const rawSetCookie = flipkartRes.headers.raw?.()["set-cookie"];

    let combinedCookies = null;
    if (rawSetCookie && rawSetCookie.length > 0) {
      // Combine into a single string usable in future requests
      combinedCookies = rawSetCookie.map((c) => c.split(";")[0]).join("; ");
    }

    return res.status(200).json({
      ...data,
      cookies: combinedCookies, // 🔥 Pass it back to frontend
    });
  } catch (error) {
    console.error("Flipkart login error:", error);
    return res.status(500).json({ message: "Failed to login to Flipkart" });
  }
}

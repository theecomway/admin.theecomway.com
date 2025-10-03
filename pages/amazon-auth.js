import React from "react";

const AmazonConnectButton = () => {
  const CLIENT_ID =
    "amzn1.application-oa2-client.767c04efbbe343f19bd5d2c11e96f809"; // From Seller Central App registration
  const REDIRECT_URI = "https://theEcomway.com/amazon-auth/callback"; // Must match what's in Seller Central
  //amzn1.application-oa2-client.767c04efbbe343f19bd5d2c11e96f809
  const handleConnect = () => {
    const amazonAuthUrl = `https://sellercentral.amazon.in/apps/authorize/consent?application_id=${CLIENT_ID}&state=custom_state&version=beta&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}`;
    window.location.href = amazonAuthUrl;
  };

  return (
    <button
      onClick={handleConnect}
      style={{ padding: "10px 20px", fontSize: "16px" }}
    >
      Connect to Amazon Seller Central
    </button>
  );
};

export default AmazonConnectButton;

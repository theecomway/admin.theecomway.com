import { Card, CardContent, Container, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

const quotes = [
  "Power without empathy destroys. Empathy with wisdom builds.",
  "The loudest voice in history is not the conqueror, but the conscience that followed.",
  "Those who listen, learn. Those who impose, repeat history.",
  "A society grows stronger not by ruling the weak, but by raising them.",
  "In every age, those who united hearts outlasted those who divided minds.",
  "Fear builds walls; courage builds bridges.",
  "Progress is born when truth meets humility.",
  "Every empire that ignored the people fell by the people's silence.",
  "Kindness may not make the headlines, but it rewrites history.",
  "The future belongs to those who balance reason, resolve, and empathy.",
];

const RandomQuote = () => {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  if (!quote) return null; // Prevent rendering before hydration

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card elevation={4} sx={{ padding: 4, borderRadius: 4 }}>
        <CardContent>
          <Typography
            variant="h6"
            component="blockquote"
            sx={{
              fontStyle: "italic",
              textAlign: "center",
              color: "text.primary",
            }}
          >
            “{quote}”
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default RandomQuote;

import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { onValue, ref, remove, update } from "firebase/database";

import { database } from "../hooks/config";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const isProduction = process.env.NODE_ENV === "production";
const basePath = isProduction ? "" : "test";
const OTP_REQUESTS_PATH = `${basePath}/otp_requests`;
const TEN_DAYS_MS = 5 * 24 * 60 * 60 * 1000; // 10 days in milliseconds
const MAX_REMINDERS = 3;

const OTPAttemptsDashboard = () => {
  const [otpRequests, setOtpRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const otpRef = ref(database, OTP_REQUESTS_PATH);
      onValue(
        otpRef,
        (snapshot) => {
          const data = snapshot.val();
          const requests = [];

          try {
            if (data) {
              Object.entries(data).forEach(([email, details]) => {
                if (details.attempts === 0 && details.phone) {
                  requests.push({
                    email,
                    phone: details.phone,
                    attempts: details.attempts,
                    otp: details.otp,
                    expiresAt: details.expiresAt,
                    lastReminder: details.lastReminder || 0,
                    remindersSent: details.remindersSent || 0,
                  });
                }
              });
            }
            setOtpRequests(requests);
            setLoading(false);
          } catch (innerErr) {
            console.error("Error processing snapshot data:", innerErr);
            setError("Failed to process OTP request data.");
            setLoading(false);
          }
        },
        (err) => {
          console.error("Firebase listener error:", err);
          setError("Failed to load OTP request data.");
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Unexpected error in useEffect:", err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }, []);

  const handleSendReminder = (phone, email, currentReminders) => {
    const encodedMsg = encodeURIComponent(
      `We’ve encountered an issue with this email address: ${email.replace(
        /\(dot\)/g,
        "."
      )}, which may have caused a problem with sending the OTP.\n\nPlease reply "YES" if this is a valid and active email address.`
    );
    const url = `https://wa.me/91${phone}?text=${encodedMsg}`;
    window.open(url, "_blank");

    const userRef = ref(database, `${OTP_REQUESTS_PATH}/${email}`);
    const now = Date.now();
    update(userRef, {
      lastReminder: now,
      remindersSent: currentReminders + 1,
    });
  };

  const handleDelete = (email) => {
    const entryRef = ref(database, `${OTP_REQUESTS_PATH}/${email}`);
    remove(entryRef);
  };

  return (
    <Box sx={{ maxWidth: "1000px", margin: "auto", p: 2 }}>
      <Typography variant="h5" mb={2}>
        OTP Failures Dashboard
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error" align="center">
          {error}
        </Typography>
      ) : otpRequests.length === 0 ? (
        <Typography align="center">No failed OTP requests found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>OTP</TableCell>
                <TableCell>Expires At</TableCell>
                <TableCell>Attempts</TableCell>
                <TableCell>Reminders Sent</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {otpRequests.map((req, idx) => {
                const now = Date.now();
                const timeSinceReminder = now - req.lastReminder;
                const reminderDueIn = TEN_DAYS_MS - timeSinceReminder;
                const canSendReminder =
                  req.remindersSent < MAX_REMINDERS &&
                  timeSinceReminder > TEN_DAYS_MS;

                return (
                  <TableRow key={idx}>
                    {/* replace all (dot) with .  */}
                    <TableCell>{req.email.replace(/\(dot\)/g, ".")}</TableCell>
                    <TableCell>
                      {canSendReminder ? (
                        <Button
                          variant="text"
                          color="primary"
                          onClick={() =>
                            handleSendReminder(req.phone, req.email)
                          }
                        >
                          {req.phone}
                        </Button>
                      ) : (
                        <Typography>{req.phone}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{req.otp}</TableCell>
                    <TableCell>
                      {dayjs(Number(req.expiresAt)).fromNow()}
                    </TableCell>
                    <TableCell>{req.attempts}</TableCell>
                    <TableCell>{req.remindersSent}</TableCell>
                    <TableCell>
                      {Array.from(
                        { length: MAX_REMINDERS },
                        (_, reminderIndex) => {
                          const reminderNum = reminderIndex + 1;
                          const isSent = req.remindersSent >= reminderNum;
                          const isNext = req.remindersSent === reminderIndex;
                          const isDue =
                            isNext &&
                            Date.now() - req.lastReminder > TEN_DAYS_MS;

                          return (
                            <Button
                              key={reminderNum}
                              variant="outlined"
                              color={isSent ? "success" : "secondary"}
                              disabled={!isDue}
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              onClick={() =>
                                handleSendReminder(
                                  req.phone,
                                  req.email,
                                  req.remindersSent
                                )
                              }
                            >
                              {isSent
                                ? `✅ R${reminderNum}`
                                : `Reminder ${reminderNum}`}
                            </Button>
                          );
                        }
                      )}

                      {req.remindersSent >= MAX_REMINDERS && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => handleDelete(req.email)}
                          size="small"
                        >
                          Delete
                        </Button>
                      )}

                      {req.remindersSent < MAX_REMINDERS &&
                        req.remindersSent > 0 &&
                        Date.now() - req.lastReminder < TEN_DAYS_MS && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="textSecondary"
                          >
                            Wait{" "}
                            {Math.ceil(
                              (TEN_DAYS_MS - (Date.now() - req.lastReminder)) /
                                (1000 * 60 * 60 * 24)
                            )}{" "}
                            day(s)
                          </Typography>
                        )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default OTPAttemptsDashboard;

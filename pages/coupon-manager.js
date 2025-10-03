import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { getDatabase, onValue, ref, set } from "firebase/database";

import { database } from "../hooks/config";

const isProduction = process.env.NODE_ENV === "production";
const basePath = isProduction ? "" : "test";

const CouponManager = () => {
  const [coupons, setCoupons] = useState({});
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const couponsRef = ref(database, `${basePath}/coupon-codes`);
    onValue(couponsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCoupons(snapshot.val());
      }
    });
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toISOString().split("T")[0];
  };

  const handleEdit = (couponKey) => {
    const coupon = coupons[couponKey];
    setSelectedCoupon({
      key: couponKey,
      discountType: coupon.discount?.type || "",
      discountValue: coupon.discount?.value || "",
      durationDays: coupon.duration?.days || "",
      message: coupon.duration?.message || coupon.message || "",
      usageCount: coupon.usageCount || "",
      usageLimit: coupon.usageLimit || "",
      validity: coupon.validity
        ? new Date(coupon.validity).toISOString().split("T")[0]
        : "",
    });
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCoupon({
      key: "",
      discountType: "",
      discountValue: "",
      durationDays: "",
      message: "",
      usageCount: "",
      usageLimit: "",
      validity: "",
    });
    setModalOpen(true);
  };

  const handleDelete = (couponKey) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this coupon?"
    );
    if (!confirmed) return;

    const db = getDatabase();
    const couponRef = ref(db, `${basePath}/coupon-codes/${couponKey}`);
    set(couponRef, null);
  };

  const handleSave = async () => {
    const db = getDatabase();
    const {
      key,
      discountType,
      discountValue,
      durationDays,
      message,
      usageCount,
      usageLimit,
      validity,
    } = selectedCoupon;

    const finalKey = key.toLowerCase();
    const saveRef = ref(db, `${basePath}/coupon-codes/${finalKey}`);

    await set(saveRef, {
      discount: {
        type: discountType,
        value: parseInt(discountValue),
      },
      duration: {
        days: parseInt(durationDays),
      },
      message: message,
      usageCount: parseInt(usageCount || 0),
      usageLimit: parseInt(usageLimit || 0),
      validity: validity ? new Date(validity).getTime() : null,
    });

    setModalOpen(false);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2
        style={{
          fontWeight: "bold",
          fontSize: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        Coupon Codes
      </h2>

      <Button
        variant="contained"
        color="primary"
        style={{ marginBottom: "1rem" }}
        onClick={handleAddNew}
      >
        Add New Coupon
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Coupon Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Validity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(coupons).map((key) => {
              const coupon = coupons[key];
              return (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                  <TableCell>{coupon.discount?.type}</TableCell>
                  <TableCell>{coupon.discount?.value}</TableCell>
                  <TableCell>{coupon.duration?.days} days</TableCell>
                  <TableCell>
                    {`${coupon?.usageCount || ""}/${
                      coupon?.usageLimit || ""
                    }` || "—"}
                  </TableCell>
                  <TableCell>
                    {coupon.duration?.message || coupon.message || "—"}
                  </TableCell>
                  <TableCell>{formatDate(coupon.validity)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleEdit(key)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      size="small"
                      onClick={() => handleDelete(key)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedCoupon?.key ? "Edit Coupon" : "Add New Coupon"}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Coupon Code"
            fullWidth
            value={selectedCoupon?.key}
            onChange={(e) =>
              setSelectedCoupon((prev) => ({
                ...prev,
                key: e.target.value,
              }))
            }
          />

          <FormControl fullWidth>
            <InputLabel>Discount Type</InputLabel>
            <Select
              value={selectedCoupon?.discountType || ""}
              onChange={(e) =>
                setSelectedCoupon((prev) => ({
                  ...prev,
                  discountType: e.target.value,
                }))
              }
              label="Discount Type"
            >
              <MenuItem value="percentage">Percentage</MenuItem>
              <MenuItem value="price">Price</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Discount Value"
            type="number"
            fullWidth
            inputProps={{ min: 0 }}
            value={selectedCoupon?.discountValue || ""}
            onChange={(e) =>
              setSelectedCoupon((prev) => ({
                ...prev,
                discountValue: e.target.value,
              }))
            }
          />

          <TextField
            label="Duration (days)"
            type="number"
            fullWidth
            inputProps={{ min: 0 }}
            value={selectedCoupon?.durationDays || ""}
            onChange={(e) =>
              setSelectedCoupon((prev) => ({
                ...prev,
                durationDays: e.target.value,
              }))
            }
          />

          <TextField
            label="Message"
            fullWidth
            inputProps={{ maxLength: 50 }}
            value={selectedCoupon?.message || ""}
            onChange={(e) =>
              setSelectedCoupon((prev) => ({
                ...prev,
                message: e.target.value,
              }))
            }
          />

          <TextField
            label="Usage Limit"
            type="number"
            fullWidth
            inputProps={{ min: 1 }}
            value={selectedCoupon?.usageLimit || ""}
            onChange={(e) =>
              setSelectedCoupon((prev) => ({
                ...prev,
                usageLimit: e.target.value,
              }))
            }
          />

          <TextField
            label="Validity"
            type="date"
            fullWidth
            value={selectedCoupon?.validity || ""}
            onChange={(e) =>
              setSelectedCoupon((prev) => ({
                ...prev,
                validity: e.target.value,
              }))
            }
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CouponManager;

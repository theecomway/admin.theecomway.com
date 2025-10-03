import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Delete,
  ExpandLess,
  ExpandMore,
  Folder,
  FolderOpen,
  InsertDriveFile,
} from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { database, storage } from "../../hooks/config";
import { ref as dbRef, get } from "firebase/database";
import { deleteObject, getDownloadURL, listAll, ref } from "firebase/storage";

const formatFolderName = (name) => {
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
  const epochPattern = /^\d{13}$/;

  let date;

  if (isoPattern.test(name)) {
    try {
      const isoLike = name
        .replace("T", " ")
        .replace(
          /-(\d{2})-(\d{2})-(\d{3})Z$/,
          (_m, mm, ss, ms) => `:${mm}:${ss}.${ms}Z`
        )
        .replace(" ", "T");

      date = new Date(isoLike);
      if (isNaN(date)) return name;
    } catch {
      return name;
    }
  } else if (epochPattern.test(name)) {
    const epoch = Number(name);
    date = new Date(epoch);
    if (isNaN(date)) return name;
  } else {
    return name; // not a valid time pattern
  }

  const now = new Date();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fetchStorageChildren = async (folderPath) => {
  const folderRef = ref(storage, folderPath);
  const result = await listAll(folderRef);

  const children = [];

  for (const prefix of result.prefixes) {
    children.push({
      type: "folder",
      name: prefix.name,
      fullPath: `${folderPath}${prefix.name}/`,
      isLoaded: false,
      children: [],
    });
  }

  for (const itemRef of result.items) {
    const url = await getDownloadURL(itemRef);
    children.push({
      type: "file",
      name: itemRef.name,
      fullPath: `${folderPath}${itemRef.name}`,
      downloadUrl: url,
    });
  }

  return children;
};

const FileItem = ({ node, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${node.name}"?`)) {
      onDelete(node);
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      px={4}
      py={1}
      sx={{
        bgcolor: "#fafafa",
        borderRadius: 1,
        "&:hover": { bgcolor: "#f0f0f0" },
      }}
    >
      <Tooltip title={node.fullPath} arrow>
        <Box display="flex" alignItems="center" gap={1}>
          <InsertDriveFile fontSize="small" color="action" />
          <Typography variant="body2">{node.name}</Typography>
        </Box>
      </Tooltip>

      <Box display="flex" alignItems="center" gap={1}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.open(node.downloadUrl, "_blank")}
        >
          Download
        </Button>
        <IconButton size="small" onClick={handleDelete} color="error">
          <Delete fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

const uidEmailCache = new Map();

const resolveUidToEmail = async (uid) => {
  if (uidEmailCache.has(uid)) return uidEmailCache.get(uid);

  try {
    const snapshot = await get(
      dbRef(database, `users-details/${uid}/details/email`)
    );
    const email = snapshot.exists() ? snapshot.val() : uid;
    uidEmailCache.set(uid, email);
    return email;
  } catch (err) {
    console.error(`Failed to fetch email for UID ${uid}`, err);
    return uid;
  }
};

const FolderItem = ({ node, onDelete, parentPath }) => {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvedName, setResolvedName] = useState(node.name);

  useEffect(() => {
    const isUid = /^[a-zA-Z0-9]{28}$/.test(node.name);
    if (isUid) {
      resolveUidToEmail(node.name).then(setResolvedName);
    } else {
      setResolvedName(formatFolderName(node.name));
    }
  }, [node.name]);

  const handleExpand = async () => {
    setOpen(!open);

    if (!open && !node.isLoaded) {
      setLoading(true);
      const fetchedChildren = await fetchStorageChildren(node.fullPath);
      setChildren(fetchedChildren);
      node.isLoaded = true;
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        px={2}
        py={1}
        onClick={handleExpand}
        sx={{
          bgcolor: open ? "#e3f2fd" : "#f5f5f5",
          borderRadius: 1,
          cursor: "pointer",
          "&:hover": { bgcolor: "#e0e0e0" },
        }}
      >
        <IconButton size="small">
          {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
        {open ? (
          <FolderOpen fontSize="small" color="primary" />
        ) : (
          <Folder fontSize="small" color="disabled" />
        )}
        <Typography variant="body2" ml={1} fontWeight={500}>
          {resolvedName}
        </Typography>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box pl={4} py={0.5}>
          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          ) : children.length > 0 ? (
            children.map((child, idx) =>
              child.type === "folder" ? (
                <FolderItem
                  key={child.fullPath + idx}
                  node={child}
                  onDelete={onDelete}
                  parentPath={node.fullPath}
                />
              ) : (
                <FileItem
                  key={child.fullPath + idx}
                  node={child}
                  onDelete={onDelete}
                />
              )
            )
          ) : (
            <Typography variant="body2" color="text.secondary" pl={2} py={1}>
              (Empty folder)
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

const StorageExplorer = ({ basePath = "" }) => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!basePath) return;

    setLoading(true);
    fetchStorageChildren(basePath)
      .then((data) => {
        setTreeData(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [basePath]);

  const handleDeleteFile = async (node) => {
    try {
      const fileRef = ref(storage, node.fullPath);
      await deleteObject(fileRef);
      setTreeData((prev) =>
        prev.filter((item) => item.fullPath !== node.fullPath)
      );
    } catch (err) {
      alert("Error deleting file: " + err.message);
    }
  };

  return (
    <Box maxWidth="800px" mx="auto" mt={4} px={2} pb={4}>
      <Divider />

      {loading ? (
        <Box textAlign="center" mt={6}>
          <CircularProgress />
          <Typography variant="body2" mt={2} color="text.secondary">
            Loading storage structure…
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1} mt={2}>
          {treeData.length ? (
            treeData.map((node, idx) =>
              node.type === "folder" ? (
                <FolderItem
                  key={node.fullPath + idx}
                  node={node}
                  onDelete={handleDeleteFile}
                  parentPath={basePath}
                />
              ) : (
                <FileItem
                  key={node.fullPath + idx}
                  node={node}
                  onDelete={handleDeleteFile}
                />
              )
            )
          ) : (
            <Typography variant="body2" mt={2} color="text.secondary">
              No files or folders found.
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default StorageExplorer;

"use client";

import { useState } from "react";
import { UploadCloud, FileType, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function UploadPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type === "application/pdf") {
                setFile(droppedFile);
            } else {
                toast.error("Invalid file type. Please upload a PDF.");
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setProgress(10);

        const formData = new FormData();
        formData.append("file", file);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setProgress((prev) => (prev < 90 ? prev + 15 : prev));
            }, 500);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setProgress(100);

            const data = await res.json();

            if (res.ok) {
                toast.success(`Successfully extracted & saved ${data.recordsInserted} records!`);
                setFile(null);
            } else {
                toast.error(data.error || "Failed to upload file");
            }
        } catch (err) {
            toast.error("An unexpected error occurred during upload.");
        } finally {
            setTimeout(() => {
                setIsUploading(false);
                setProgress(0);
            }, 500);
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-12">
            <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Upload Timecard</h1>
                <p className="text-muted-foreground">Upload the MM Team Members PDF timecard to extract data automatically.</p>
            </div>

            <Card className="border-dashed border-2 bg-muted/20 relative overflow-hidden transition-colors data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/5" data-dragging={isDragging} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                <CardContent className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <AnimatePresence mode="wait">
                        {!file ? (
                            <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center gap-4">
                                <div className="p-4 rounded-full bg-primary/10 text-primary">
                                    <UploadCloud className="w-10 h-10" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg">Drag & drop your PDF here</h3>
                                    <p className="text-sm text-muted-foreground">or click to browse from your device</p>
                                </div>
                                <div className="mt-2">
                                    <Button variant="secondary" onClick={() => document.getElementById("file-upload")?.click()}>
                                        <span>Browse Files</span>
                                    </Button>
                                    <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="file" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 w-full max-w-sm">
                                <div className="flex items-center gap-4 w-full p-4 rounded-xl bg-background border shadow-sm">
                                    <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                                        <FileType className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="font-medium text-sm truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    {!isUploading && (
                                        <Button variant="ghost" size="icon" onClick={() => setFile(null)} className="shrink-0 text-muted-foreground hover:text-destructive">
                                            <AlertCircle className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>

                                {isUploading && (
                                    <div className="w-full space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Uploading & Extracting...</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                )}

                                <Button className="w-full" size="lg" onClick={handleUpload} disabled={isUploading}>
                                    {isUploading ? "Uploading..." : "Import Timecard Data"}
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>
        </div>
    );
}

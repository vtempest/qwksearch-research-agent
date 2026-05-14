/**
 * React component that renders ChatInputBox within the ResearchAgent area of ResearchAgent.
 */
import React, { useState, useRef, useEffect } from "react";
import { Icons } from "./MessageInputIconSet";
import { FilePreviewCard } from "../FileUpload/FilePreviewCard";
import { PastedContentCard } from "./PastedContentCard";
import { useChat } from '@/components/ResearchAgent/hooks/useChat';
import { useSpeechInput } from '@/components/ResearchAgent/hooks/voice/useSpeechToTranscript';
import { useFileHandling } from '../FileUpload/useFileHandling';
import { ActionBar } from './ActionBar';
import { LiveWaveform } from '@/components/ui/live-waveform';

const ChatInputBox = () => {
    const { loading, sendMessage, stopStreaming, files: contextFiles, fileIds: contextFileIds, setFiles: setContextFiles, setFileIds: setContextFileIds } = useChat();
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        files, setFiles,
        pastedContent, setPastedContent,
        isDragging,
        handleFiles,
        onDragOver, onDragLeave, onDrop,
        handlePaste,
        resetAttachments,
    } = useFileHandling({
        setMessage,
        contextFiles,
        contextFileIds,
        setContextFiles,
        setContextFileIds,
    });

    const resetInput = () => {
        setMessage("");
        resetAttachments();
        if (textareaRef.current) textareaRef.current.style.height = "auto";
    };

    const { isListening, toggleSpeech, isSpeechSupported } = useSpeechInput(
        (transcript) => setMessage(transcript),
        () => {
            setMessage(prev => {
                if (prev.trim()) {
                    setTimeout(() => {
                        sendMessage(prev);
                        resetInput();
                    }, 0);
                }
                return prev;
            });
        }
    );

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 384) + "px";
        }
    }, [message]);

    const handleSend = () => {
        if (loading) return;
        if (!message.trim() && files.length === 0 && pastedContent.length === 0) return;
        sendMessage(message);
        resetInput();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const hasContent = !!(message.trim() || files.length > 0 || pastedContent.length > 0);

    return (
        <div
            className="relative w-full max-w-2xl mx-auto transition-all duration-300 font-sans"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* Main Container */}
            <div className="!box-content flex flex-col mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-2xl cursor-text border border-bg-300 dark:border-transparent shadow-[0_0_15px_rgba(0,0,0,0.08)] hover:shadow-[0_0_20px_rgba(0,0,0,0.12)] focus-within:shadow-[0_0_25px_rgba(0,0,0,0.15)] bg-white dark:bg-[#30302E] font-sans antialiased">

                <div className="flex flex-col px-3 pt-3 gap-2 pb-2">

                    {/* 1. Artifacts (Files & Pastes) */}
                    {(files.length > 0 || pastedContent.length > 0) && (
                        <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 px-1">
                            {pastedContent.map(content => (
                                <PastedContentCard
                                    key={content.id}
                                    content={content}
                                    onRemove={id => setPastedContent(prev => prev.filter(c => c.id !== id))}
                                />
                            ))}
                            {files.map(file => (
                                <FilePreviewCard
                                    key={file.id}
                                    file={file}
                                    onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
                                />
                            ))}
                        </div>
                    )}

                    {/* 2. Waveform (visible when listening) */}
                    {isListening && (
                        <LiveWaveform
                            active={isListening}
                            mode="static"
                            height={48}
                            barWidth={3}
                            barGap={2}
                            barColor="gray"
                            fadeEdges={true}
                            sensitivity={1.2}
                            className="w-full rounded-lg"
                        />
                    )}

                    {/* 3. Input Area */}
                    <div className="relative mb-1">
                        <div className="max-h-96 w-full overflow-y-auto custom-scrollbar font-sans break-words transition-opacity duration-200 min-h-[2.5rem] pl-1">
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onPaste={handlePaste}
                                onKeyDown={handleKeyDown}
                                placeholder="What are you curious to research?"
                                className="w-full bg-transparent border-0 outline-none text-text-100 text-[16px] placeholder:text-text-400 resize-none overflow-hidden py-0 leading-relaxed block font-normal antialiased"
                                rows={1}
                                autoFocus
                                style={{ minHeight: '1.5em' }}
                            />
                        </div>
                    </div>

                    {/* 4. Action Bar */}
                    <ActionBar
                        loading={loading}
                        isListening={isListening}
                        isSpeechSupported={isSpeechSupported}
                        toggleSpeech={toggleSpeech}
                        handleFiles={handleFiles}
                        hasContent={hasContent}
                        handleSend={handleSend}
                        onStop={stopStreaming}
                    />
                </div>
            </div>

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-bg-200/90 border-2 border-dashed border-accent rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
                    <Icons.Archive className="w-10 h-10 text-accent mb-2 animate-bounce" />
                    <p className="text-accent font-medium">Drop files to upload</p>
                </div>
            )}
        </div>
    );
};

export default ChatInputBox;

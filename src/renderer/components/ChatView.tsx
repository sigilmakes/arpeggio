import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import type { ChatMessage, ToolCall, ThinkingBlock } from '@shared/message-types'

export function ChatView(): React.ReactElement {
    const { activeChannel, messages, sendMessage, toggleToolCall, toggleThinking } = useChat()
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length, messages[messages.length - 1]?.content])

    useEffect(() => { inputRef.current?.focus() }, [activeChannel?.id])

    const handleSend = async () => {
        if (!input.trim() || sending) return
        const content = input
        setInput('')
        setSending(true)
        await sendMessage(content)
        setSending(false)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    if (!activeChannel) {
        return (
            <div className="chat-view-empty">
                <p>Select a channel to start chatting</p>
            </div>
        )
    }

    return (
        <div className="chat-view">
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-messages-empty">
                        <h3>#{activeChannel.name}</h3>
                        <p>This is the start of the conversation.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        onToggleToolCall={toggleToolCall}
                        onToggleThinking={() => toggleThinking(msg.id)}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <textarea
                    ref={inputRef}
                    className="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${activeChannel.name}…`}
                    rows={1}
                />
                <button
                    className="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    title="Send (Enter)"
                >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M3 3l14 7-14 7V12l8-2-8-2V3z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}

// ── Message Bubble ─────────────────────────────────────────

function MessageBubble({
    message,
    onToggleToolCall,
    onToggleThinking
}: {
    message: ChatMessage
    onToggleToolCall: (messageId: string, toolCallId: string) => void
    onToggleThinking: () => void
}): React.ReactElement {
    const isSystem = message.sender.type === 'system'
    const isUser = message.sender.type === 'user'

    if (isSystem) {
        return (
            <div className="chat-msg chat-msg-system">
                <span className="chat-msg-system-text">{message.content}</span>
            </div>
        )
    }

    return (
        <div className={`chat-msg ${isUser ? 'chat-msg-user' : 'chat-msg-agent'}`}>
            <div className="chat-msg-avatar">
                {message.sender.name.charAt(0).toUpperCase()}
            </div>
            <div className="chat-msg-body">
                <div className="chat-msg-header">
                    <span className="chat-msg-name">{message.sender.name}</span>
                    <span className="chat-msg-time">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Thinking block */}
                {message.thinking && (
                    <ThinkingBlockView thinking={message.thinking} onToggle={onToggleThinking} />
                )}

                {/* Streaming indicator */}
                {message.streaming && !message.content && (
                    <div className="chat-msg-streaming">
                        <span className="chat-streaming-dot" />
                        <span className="chat-streaming-dot" />
                        <span className="chat-streaming-dot" />
                    </div>
                )}

                {/* Message content */}
                {message.content && (
                    <div className="chat-msg-content">
                        <MessageContent content={message.content} />
                    </div>
                )}

                {/* Tool calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="chat-tool-calls">
                        {message.toolCalls.map((tc) => (
                            <ToolCallBlock
                                key={tc.id}
                                toolCall={tc}
                                onToggle={() => onToggleToolCall(message.id, tc.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Thinking Block ─────────────────────────────────────────

function ThinkingBlockView({
    thinking,
    onToggle
}: {
    thinking: ThinkingBlock
    onToggle: () => void
}): React.ReactElement {
    const duration = thinking.durationMs
        ? thinking.durationMs < 1000
            ? `${thinking.durationMs}ms`
            : `${(thinking.durationMs / 1000).toFixed(1)}s`
        : null

    const preview = thinking.content.split('\n')[0].slice(0, 80)

    return (
        <div className="thinking-block">
            <button className="thinking-block-header" onClick={onToggle}>
                <span className="thinking-block-chevron">{thinking.collapsed ? '▸' : '▾'}</span>
                <span className="thinking-block-icon">💭</span>
                <span className="thinking-block-label">Thinking</span>
                {duration && <span className="thinking-block-duration">{duration}</span>}
                {thinking.collapsed && (
                    <span className="thinking-block-preview">{preview}{thinking.content.length > 80 ? '…' : ''}</span>
                )}
            </button>
            {!thinking.collapsed && (
                <div className="thinking-block-body">
                    <pre className="thinking-block-content">{thinking.content}</pre>
                </div>
            )}
        </div>
    )
}

// ── Tool Call Block ────────────────────────────────────────

function ToolCallBlock({
    toolCall,
    onToggle
}: {
    toolCall: ToolCall
    onToggle: () => void
}): React.ReactElement {
    const statusIcon = toolCall.status === 'running' ? '⟳' : toolCall.status === 'error' ? '✗' : '✓'
    const statusClass = `tool-status-${toolCall.status}`
    const summary = formatToolSummary(toolCall)
    const outputText = formatToolOutput(toolCall.output)

    return (
        <div className={`tool-call-block ${statusClass}`}>
            <button className="tool-call-header" onClick={onToggle}>
                <span className="tool-call-chevron">{toolCall.collapsed ? '▸' : '▾'}</span>
                <span className={`tool-call-status-icon ${statusClass}`}>{statusIcon}</span>
                <span className="tool-call-name">{toolCall.name}</span>
                <span className="tool-call-summary">{summary}</span>
            </button>

            {!toolCall.collapsed && (
                <div className="tool-call-body">
                    {outputText && (
                        <pre className="tool-call-code">{outputText}</pre>
                    )}
                    {toolCall.status === 'running' && !outputText && (
                        <div className="tool-call-running">Running…</div>
                    )}
                </div>
            )}
        </div>
    )
}

/** Format a one-line summary from tool name + args */
function formatToolSummary(tc: ToolCall): string {
    try {
        const args = JSON.parse(tc.input)
        switch (tc.name.toLowerCase()) {
            case 'read':
                return args.path || ''
            case 'write':
                return args.path || ''
            case 'edit':
                return args.path || ''
            case 'bash':
                return (args.command || '').slice(0, 80)
            case 'search':
            case 'grep':
                return args.pattern || args.query || ''
            default:
                // Single string arg → show it; object → show first key's value
                if (typeof args === 'string') return args.slice(0, 80)
                const firstVal = Object.values(args)[0]
                return typeof firstVal === 'string' ? firstVal.slice(0, 80) : ''
        }
    } catch {
        return tc.input.slice(0, 60)
    }
}

/** Clean up tool output for display */
function formatToolOutput(output: string | undefined): string {
    if (!output) return ''
    // Try to unwrap JSON-stringified text
    try {
        const parsed = JSON.parse(output)
        if (typeof parsed === 'string') return parsed
        if (parsed.content) return typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content, null, 2)
        if (parsed.result) return typeof parsed.result === 'string' ? parsed.result : JSON.stringify(parsed.result, null, 2)
        if (parsed.output) return typeof parsed.output === 'string' ? parsed.output : JSON.stringify(parsed.output, null, 2)
        return JSON.stringify(parsed, null, 2)
    } catch {
        return output
    }
}

// ── Markdown-lite content rendering ────────────────────────

function MessageContent({ content }: { content: string }): React.ReactElement {
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).replace(/^\w+\n/, '')
                    return <pre key={i} className="chat-code-block"><code>{code}</code></pre>
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return <code key={i} className="chat-inline-code">{part.slice(1, -1)}</code>
                }
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.slice(2, -2)}</strong>
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                    return <em key={i}>{part.slice(1, -1)}</em>
                }
                const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
                if (linkMatch) {
                    return <a key={i} href={linkMatch[2]} className="chat-link" target="_blank" rel="noreferrer">{linkMatch[1]}</a>
                }
                return <span key={i}>{part.split('\n').map((line, j, arr) => (
                    <React.Fragment key={j}>
                        {line}
                        {j < arr.length - 1 && <br />}
                    </React.Fragment>
                ))}</span>
            })}
        </>
    )
}

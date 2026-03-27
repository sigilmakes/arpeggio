import React, { useState, useRef, useEffect } from 'react'
import { useChat } from '../context/ChatContext'
import type { ChatMessage } from '@shared/message-types'

export function ChatView(): React.ReactElement {
    const { activeChannel, messages, sendMessage } = useChat()
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    // Focus input on channel change
    useEffect(() => {
        inputRef.current?.focus()
    }, [activeChannel?.id])

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
            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-messages-empty">
                        <h3>#{activeChannel.name}</h3>
                        <p>This is the start of the conversation.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
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

function MessageBubble({ message }: { message: ChatMessage }): React.ReactElement {
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
                <div className="chat-msg-content">
                    <MessageContent content={message.content} />
                </div>
            </div>
        </div>
    )
}

// ── Markdown-lite content rendering ────────────────────────

function MessageContent({ content }: { content: string }): React.ReactElement {
    // Simple markdown: **bold**, *italic*, `code`, ```code blocks```, [links](url)
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).replace(/^\w+\n/, '') // strip language hint
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
                // Plain text — preserve newlines
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

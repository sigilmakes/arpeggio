import React, { useCallback, useRef } from 'react'

interface ResizeHandleProps {
    side: 'left' | 'right'
    onResize: (delta: number) => void
}

export function ResizeHandle({ side, onResize }: ResizeHandleProps): React.ReactElement {
    const startXRef = useRef(0)

    const onMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            startXRef.current = e.clientX
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'

            const onMouseMove = (ev: MouseEvent) => {
                const delta = ev.clientX - startXRef.current
                startXRef.current = ev.clientX
                onResize(side === 'left' ? delta : -delta)
            }

            const onMouseUp = () => {
                document.body.style.cursor = ''
                document.body.style.userSelect = ''
                document.removeEventListener('mousemove', onMouseMove)
                document.removeEventListener('mouseup', onMouseUp)
            }

            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
        },
        [side, onResize]
    )

    return (
        <div
            className={`resize-handle resize-handle-${side}`}
            onMouseDown={onMouseDown}
        />
    )
}

import React from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core'
import { commonmark } from '@milkdown/kit/preset/commonmark'
import { gfm } from '@milkdown/kit/preset/gfm'
import { history } from '@milkdown/kit/plugin/history'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'

interface MilkdownEditorInnerProps {
    defaultValue: string
    onChange?: (content: string) => void
    spellcheck?: boolean
}

function MilkdownEditorInner({ defaultValue, onChange, spellcheck }: MilkdownEditorInnerProps): React.ReactElement {
    useEditor((root) => {
        if (spellcheck !== undefined) {
            root.setAttribute('spellcheck', String(spellcheck))
        }

        const editor = Editor.make()
            .config((ctx) => {
                ctx.set(rootCtx, root)
                ctx.set(defaultValueCtx, defaultValue)
                if (onChange) {
                    ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
                        onChange(markdown)
                    })
                }
            })
            .use(commonmark)
            .use(gfm)
            .use(history)
            .use(listener)

        return editor
    }, [defaultValue])

    return <Milkdown />
}

interface MilkdownEditorProps {
    defaultValue: string
    onChange?: (content: string) => void
    spellcheck?: boolean
}

export function MilkdownEditor({ defaultValue, onChange, spellcheck }: MilkdownEditorProps): React.ReactElement {
    return (
        <MilkdownProvider>
            <ProsemirrorAdapterProvider>
                <MilkdownEditorInner defaultValue={defaultValue} onChange={onChange} spellcheck={spellcheck} />
            </ProsemirrorAdapterProvider>
        </MilkdownProvider>
    )
}

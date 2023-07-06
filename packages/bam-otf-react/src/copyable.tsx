import React, {useEffect, useState} from 'react'

export interface CopyableProps {
  text: string
  onCopied?: () => void
}

/**
 * Component that allows the user to copy a text to the clipboard
 *
 * @param {CopyableProps} props
 * @returns
 */
export function Copyable({text, onCopied}: CopyableProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (copied) {
        setCopied(false)
        onCopied?.()
      }
    }, 3000)

    return () => {
      clearTimeout(timeout)
    }
  }, [copied, onCopied])

  return (
    <div className="copyable">
      <span className="copyable-input">{text}</span>
      <button onClick={handleCopy} className="copyable-button">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

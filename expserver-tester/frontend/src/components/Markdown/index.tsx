import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose your favorite theme
import styles from './styles.module.css';
import 'github-markdown-css/github-markdown.css';
import remarkGfm from 'remark-gfm';
import { FC, useMemo } from 'react';

export interface MarkdownProps {
    text: string,
}


/**
 * Markdown Component
 * 
 * This component renders Markdown content using `react-markdown` and supports syntax highlighting 
 * for code blocks using `react-syntax-highlighter`.
 */
const Markdown: FC<MarkdownProps> = ({
    text
}) => {
    const customComponents = useMemo(() => ({
        code({ node, className = "", children, ...props }) {
            const match = className.match(/language-(\w+)/);
            return match ? (
                <SyntaxHighlighter
                    style={okaidia}
                    language={match[1] || "plaintext"}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        }
    }), []);

    return (
        <div className={styles.markdownBody}>
            <ReactMarkdown
                components={customComponents}
                remarkPlugins={[remarkGfm]}
            >
                {text}
            </ReactMarkdown>
        </div>
    )
}

export default Markdown;
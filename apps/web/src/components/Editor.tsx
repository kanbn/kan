'use client';

import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, tablePlugin, codeBlockPlugin, thematicBreakPlugin, markdownShortcutPlugin, MDXEditorMethods, MDXEditorProps, linkPlugin, imagePlugin, } from '@mdxeditor/editor';
import { ForwardedRef } from 'react';

export default function Editor({
  editorRef,
  ...props
}: { editorRef?: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return <MDXEditor
    plugins={[
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      tablePlugin(),
      codeBlockPlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      imagePlugin(),
    ]}
    {...props}
    contentEditableClassName='prose dark:prose-invert'
    ref={editorRef}
  />;
}
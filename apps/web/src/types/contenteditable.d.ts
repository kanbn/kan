declare module "react-contenteditable" {
  import React from "react";

  type ChangeEventHandler<T = Element> = (event: React.ChangeEvent<T>) => void;
  type KeyUpHandler<T = Element> = (event: React.KeyboardEvent<T>) => void;
  type KeyDownHandler<T = Element> = (event: React.KeyboardEvent<T>) => void;

  interface ContentEditableProps extends React.HTMLAttributes<HTMLDivElement> {
    html: string;
    onChange?: ChangeEventHandler<HTMLTextAreaElement | HTMLInputElement>;
    onBlur?: () => void;
    onKeyUp?: KeyUpHandler<HTMLTextAreaElement | HTMLInputElement>;
    onKeyDown?: KeyDownHandler<HTMLTextAreaElement | HTMLInputElement>;
    disabled?: boolean;
    tagName?: string;
    className?: string;
    style?: React.CSSProperties;
    innerRef?:
      | React.RefObject<HTMLElement | null>
      | ((instance: HTMLElement | null) => void);
    placeholder?: string;
  }

  class ContentEditable extends React.Component<ContentEditableProps> {}

  interface ContentEditableElement extends HTMLElement {
    value: string;
  }

  export default ContentEditable;
}

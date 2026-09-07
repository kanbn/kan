import type { ReactNode, RefCallback } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api } from "~/utils/api";
import { getNextCardCoverUrlBatch } from "~/utils/cardCoverUrls";

interface CardCoverImagesContextValue {
  register: (attachmentPublicId: string, element: HTMLElement) => void;
  unregister: (element: HTMLElement) => void;
  urls: Record<string, string | null>;
}

const CardCoverImagesContext = createContext<CardCoverImagesContextValue>({
  register: () => undefined,
  unregister: () => undefined,
  urls: {},
});

export function CardCoverImagesProvider({
  boardPublicId,
  children,
}: {
  boardPublicId: string;
  children: ReactNode;
}) {
  const elements = useRef(new Map<HTMLElement, string>());
  const observer = useRef<IntersectionObserver | null>(null);
  const [visibleAttachmentPublicIds, setVisibleAttachmentPublicIds] = useState<
    Set<string>
  >(new Set());
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [batch, setBatch] = useState<string[]>([]);

  useEffect(() => {
    setVisibleAttachmentPublicIds(new Set());
    setUrls({});
    setBatch([]);
  }, [boardPublicId]);

  useEffect(() => {
    const markVisible = (publicId: string) => {
      setVisibleAttachmentPublicIds((current) => {
        if (current.has(publicId)) return current;
        return new Set(current).add(publicId);
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      elements.current.forEach(markVisible);
      return;
    }

    const currentObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const publicId = elements.current.get(entry.target as HTMLElement);
          if (publicId) markVisible(publicId);
        });
      },
      { rootMargin: "600px 400px" },
    );

    observer.current = currentObserver;
    elements.current.forEach((_publicId, element) => {
      currentObserver.observe(element);
    });

    return () => {
      currentObserver.disconnect();
      observer.current = null;
    };
  }, [boardPublicId]);

  useEffect(() => {
    if (batch.length > 0) return;

    const nextBatch = getNextCardCoverUrlBatch(
      visibleAttachmentPublicIds,
      urls,
    );
    if (nextBatch.length > 0) setBatch(nextBatch);
  }, [batch.length, urls, visibleAttachmentPublicIds]);

  const coverUrls = api.board.coverUrls.useQuery(
    {
      boardPublicId,
      attachmentPublicIds: batch,
      width: 640,
    },
    {
      enabled: boardPublicId.length >= 12 && batch.length > 0,
      retry: 1,
    },
  );

  useEffect(() => {
    if (batch.length === 0 || (!coverUrls.data && !coverUrls.isError)) return;

    setUrls((current) => ({
      ...current,
      ...Object.fromEntries(batch.map((publicId) => [publicId, null])),
      ...coverUrls.data,
    }));
    setBatch([]);
  }, [batch, coverUrls.data, coverUrls.isError]);

  const register = useCallback(
    (attachmentPublicId: string, element: HTMLElement) => {
      elements.current.set(element, attachmentPublicId);

      if (observer.current) {
        observer.current.observe(element);
      } else if (typeof IntersectionObserver === "undefined") {
        setVisibleAttachmentPublicIds((current) => {
          if (current.has(attachmentPublicId)) return current;
          return new Set(current).add(attachmentPublicId);
        });
      }
    },
    [],
  );

  const unregister = useCallback((element: HTMLElement) => {
    observer.current?.unobserve(element);
    elements.current.delete(element);
  }, []);

  const value = useMemo(
    () => ({ register, unregister, urls }),
    [register, unregister, urls],
  );

  return (
    <CardCoverImagesContext.Provider value={value}>
      {children}
    </CardCoverImagesContext.Provider>
  );
}

export function useCardCoverImage(attachmentPublicId: string | undefined): {
  ref: RefCallback<HTMLElement>;
  isResolved: boolean;
  url: string | null;
} {
  const { register, unregister, urls } = useContext(CardCoverImagesContext);
  const element = useRef<HTMLElement | null>(null);

  const ref = useCallback<RefCallback<HTMLElement>>(
    (nextElement) => {
      if (element.current) unregister(element.current);
      element.current = nextElement;

      if (nextElement && attachmentPublicId) {
        register(attachmentPublicId, nextElement);
      }
    },
    [attachmentPublicId, register, unregister],
  );

  useEffect(
    () => () => {
      if (element.current) unregister(element.current);
    },
    [unregister],
  );

  return {
    ref,
    isResolved: attachmentPublicId ? attachmentPublicId in urls : true,
    url: attachmentPublicId ? (urls[attachmentPublicId] ?? null) : null,
  };
}

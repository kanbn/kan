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

import type { RouterOutputs } from "~/utils/api";
import type { BoardBackgroundPreviewSource } from "~/utils/boardBackgrounds";
import { api } from "~/utils/api";
import {
  getBoardBackgroundImageAttributes,
  getNextBoardBackgroundUrlBatch,
} from "~/utils/boardBackgrounds";
import PatternedBackground from "./PatternedBackground";

type BoardBackgroundValue = RouterOutputs["board"]["byId"]["background"];

interface BoardBackgroundImagesContextValue {
  register: (
    boardPublicId: string,
    version: string,
    element: HTMLElement,
  ) => void;
  unregister: (element: HTMLElement) => void;
  urls: Record<string, BoardBackgroundPreviewSource[] | null>;
}

const BoardBackgroundImagesContext =
  createContext<BoardBackgroundImagesContextValue>({
    register: () => undefined,
    unregister: () => undefined,
    urls: {},
  });

const URL_BATCH_SIZE = 40;

export function BoardBackgroundImagesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const elements = useRef(
    new Map<HTMLElement, { boardPublicId: string; version: string }>(),
  );
  const observer = useRef<IntersectionObserver | null>(null);
  const [visibleBackgrounds, setVisibleBackgrounds] = useState<
    Map<string, string>
  >(new Map());
  const [urls, setUrls] = useState<
    Record<string, BoardBackgroundPreviewSource[] | null>
  >({});
  const [batch, setBatch] = useState<
    { cacheKey: string; boardPublicId: string }[]
  >([]);

  useEffect(() => {
    const markVisible = (boardPublicId: string, version: string) => {
      const cacheKey = `${boardPublicId}:${version}`;
      setVisibleBackgrounds((current) => {
        if (current.has(cacheKey)) return current;
        return new Map(current).set(cacheKey, boardPublicId);
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      elements.current.forEach(({ boardPublicId, version }) => {
        markVisible(boardPublicId, version);
      });
      return;
    }

    const currentObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const background = elements.current.get(entry.target as HTMLElement);
          if (background)
            markVisible(background.boardPublicId, background.version);
        });
      },
      { rootMargin: "400px" },
    );

    observer.current = currentObserver;
    elements.current.forEach((_publicId, element) => {
      currentObserver.observe(element);
    });

    return () => {
      currentObserver.disconnect();
      observer.current = null;
    };
  }, []);

  useEffect(() => {
    if (batch.length > 0) return;

    const nextCacheKeys = getNextBoardBackgroundUrlBatch(
      visibleBackgrounds.keys(),
      urls,
      URL_BATCH_SIZE,
    );
    if (nextCacheKeys.length > 0)
      setBatch(
        nextCacheKeys.map((cacheKey) => ({
          cacheKey,
          boardPublicId: visibleBackgrounds.get(cacheKey) ?? "",
        })),
      );
  }, [batch.length, urls, visibleBackgrounds]);

  const backgroundUrls = api.boardBackground.urls.useQuery(
    {
      boardPublicIds:
        batch.length > 0
          ? batch.map(({ boardPublicId }) => boardPublicId)
          : ["PLACEHOLDER_"],
    },
    { enabled: batch.length > 0, retry: 1 },
  );

  useEffect(() => {
    if (batch.length === 0 || (!backgroundUrls.data && !backgroundUrls.isError))
      return;

    setUrls((current) => ({
      ...current,
      ...Object.fromEntries(
        batch.map(({ cacheKey, boardPublicId }) => [
          cacheKey,
          backgroundUrls.data?.[boardPublicId] ?? null,
        ]),
      ),
    }));
    setBatch([]);
  }, [backgroundUrls.data, backgroundUrls.isError, batch]);

  const register = useCallback(
    (boardPublicId: string, version: string, element: HTMLElement) => {
      elements.current.set(element, { boardPublicId, version });

      if (observer.current) {
        observer.current.observe(element);
      } else if (typeof IntersectionObserver === "undefined") {
        const cacheKey = `${boardPublicId}:${version}`;
        setVisibleBackgrounds((current) => {
          if (current.has(cacheKey)) return current;
          return new Map(current).set(cacheKey, boardPublicId);
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
    <BoardBackgroundImagesContext.Provider value={value}>
      {children}
    </BoardBackgroundImagesContext.Provider>
  );
}

function useBoardBackgroundImage(
  boardPublicId: string,
  version: string | undefined,
) {
  const { register, unregister, urls } = useContext(
    BoardBackgroundImagesContext,
  );
  const element = useRef<HTMLElement | null>(null);

  const ref = useCallback<RefCallback<HTMLElement>>(
    (nextElement) => {
      if (element.current) unregister(element.current);
      element.current = nextElement;

      if (nextElement && version) register(boardPublicId, version, nextElement);
    },
    [boardPublicId, register, unregister, version],
  );

  useEffect(
    () => () => {
      if (element.current) unregister(element.current);
    },
    [unregister],
  );

  const cacheKey = version ? `${boardPublicId}:${version}` : null;
  return { ref, sources: cacheKey ? (urls[cacheKey] ?? undefined) : undefined };
}

export function BoardBackground({
  boardPublicId,
  background,
}: {
  boardPublicId: string;
  background: BoardBackgroundValue | undefined;
}) {
  const isImage = background?.kind === "image";
  const { ref, sources } = useBoardBackgroundImage(
    boardPublicId,
    isImage ? background.version : undefined,
  );
  const image = getBoardBackgroundImageAttributes(sources);

  if (background?.kind === "colour") {
    return (
      <div
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        style={{ backgroundColor: background.colourCode }}
        aria-hidden="true"
      />
    );
  }

  if (isImage) {
    return (
      <div
        ref={ref}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        aria-hidden="true"
      >
        {image ? (
          // Signed object-storage URLs cannot be handled by next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            srcSet={image.srcSet}
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <PatternedBackground />
        )}
      </div>
    );
  }

  return <PatternedBackground />;
}

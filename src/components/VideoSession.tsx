'use client';

import dynamic from "next/dynamic";

// The Videocall component is imported dynamically as it uses the Zoom Video SDK that needs access to the browser environment
const Videocall = dynamic<{ slug: string; JWT: string }>(
    () => import("./Videocall"),
    { ssr: false },
);

export default function VideoSession({ slug, JWT }: { slug: string; JWT: string }) {
    return (
        <Videocall slug={slug} JWT={JWT} />
    );
} 
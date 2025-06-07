import { useEffect } from "react";

export default function TrelloAuthorize() {
    useEffect(() => {
        const hash = window.location.hash;
        const token = hash.split("=")[1];
        if (token) {
            console.log("Posting token to /api/trello/authenticate", token);
            fetch("/api/trello/authenticate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ token }),
            }).then(() => {
                window.close();
            });
        }
    }, []);

    return <div className="flex h-[200px] items-center justify-center">
        <p className="text-center">Connecting to Trello...</p>
    </div>;
}
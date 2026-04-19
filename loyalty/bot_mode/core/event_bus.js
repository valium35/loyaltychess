export const EventBus = {

    emit(type, detail = {}, source = "unknown") {
        if (!type || typeof type !== "string") {
            console.warn("EventBus: invalid event type", type);
            return;
        }

        window.dispatchEvent(
            new CustomEvent(type, {
                detail: {
                    ...detail,
                    __source: source,
                    __timestamp: Date.now()
                }
            })
        );
    }
};
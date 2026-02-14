/**
 * Haversine formula to calculate the distance between two points on the Earth.
 * Returns distance in kilometers.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export interface Location {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    [key: string]: any;
}

/**
 * Finds the nearest item from a list based on a target location.
 */
export function findNearest(targetLat: number, targetLon: number, items: Location[]) {
    if (!items.length) return null;

    let nearest = items[0];
    let minDistance = calculateDistance(targetLat, targetLon, items[0].latitude, items[0].longitude);

    for (let i = 1; i < items.length; i++) {
        const dist = calculateDistance(targetLat, targetLon, items[i].latitude, items[i].longitude);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = items[i];
        }
    }

    return { item: nearest, distance: minDistance };
}

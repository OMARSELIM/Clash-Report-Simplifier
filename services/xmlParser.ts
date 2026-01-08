import { ClashItem, ClashStatus } from '../types';

/**
 * Parses a Navisworks XML export into a structured ClashItem array.
 * Note: Browser DOMParser is used here to handle XML structures.
 */
export const parseNavisworksXML = async (file: File): Promise<ClashItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        const clashResults = xmlDoc.getElementsByTagName("clashresult");
        const parsedItems: ClashItem[] = [];

        if (clashResults.length === 0) {
            reject(new Error("No <clashresult> tags found. Ensure this is a valid Navisworks XML Report."));
            return;
        }

        for (let i = 0; i < clashResults.length; i++) {
          const result = clashResults[i];
          
          const name = result.getAttribute("name") || `Clash ${i + 1}`;
          const statusStr = result.getElementsByTagName("resultstatus")[0]?.textContent || "Unknown";
          const distanceStr = result.getElementsByTagName("distance")[0]?.textContent || "0";
          const gridLocation = result.getElementsByTagName("gridlocation")[0]?.textContent || "";

          // Position
          const posNode = result.getElementsByTagName("clashpoint")[0]?.getElementsByTagName("pos")[0];
          const point = {
            x: parseFloat(posNode?.getAttribute("x") || "0"),
            y: parseFloat(posNode?.getAttribute("y") || "0"),
            z: parseFloat(posNode?.getAttribute("z") || "0"),
          };

          // Items (Navisworks usually has item1 and item2 inside clashobjects)
          const objects = result.getElementsByTagName("clashobject");
          let item1 = "Unknown";
          let item2 = "Unknown";
          let layer1 = "Unknown";
          let layer2 = "Unknown";

          if (objects.length >= 2) {
            // First Object
            const obj1 = objects[0];
            item1 = obj1.getElementsByTagName("name")[0]?.textContent || 
                    obj1.getElementsByTagName("smarttag")[0]?.getElementsByTagName("value")[0]?.textContent || "Unknown Item";
            layer1 = obj1.getElementsByTagName("layer")[0]?.textContent || "Unknown Layer";

            // Second Object
            const obj2 = objects[1];
            item2 = obj2.getElementsByTagName("name")[0]?.textContent || 
                    obj2.getElementsByTagName("smarttag")[0]?.getElementsByTagName("value")[0]?.textContent || "Unknown Item";
            layer2 = obj2.getElementsByTagName("layer")[0]?.textContent || "Unknown Layer";
          }

          parsedItems.push({
            id: `c-${i}`,
            name,
            status: mapStatus(statusStr),
            distance: parseFloat(distanceStr),
            item1,
            item2,
            layer1,
            layer2,
            point,
            gridLocation
          });
        }

        resolve(parsedItems);

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};

const mapStatus = (status: string): ClashStatus => {
  const s = status.toLowerCase();
  if (s.includes('new')) return ClashStatus.NEW;
  if (s.includes('active')) return ClashStatus.ACTIVE;
  if (s.includes('review')) return ClashStatus.REVIEWED;
  if (s.includes('approv')) return ClashStatus.APPROVED;
  if (s.includes('resolv')) return ClashStatus.RESOLVED;
  return ClashStatus.UNKNOWN;
};

import {beforeEach,expect,it,vi} from "vitest";
const {count}=vi.hoisted(()=>({count:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{user:{count}}}));
import {GET} from "../src/app/api/public/stats/route";
beforeEach(()=>{count.mockReset();});
it("exposes only the active student total, including a real zero",async()=>{
 count.mockResolvedValue(0);const response=await GET();
 expect(await response.json()).toEqual({students:0});
 expect(count).toHaveBeenCalledWith({where:{role:"STUDENT",active:true}});
 expect(response.headers.get("Cache-Control")).toContain("s-maxage=60");
});
it("does not publish a fake zero or database details when unavailable",async()=>{
 count.mockRejectedValue(new Error("private database failure"));const response=await GET();
 expect(response.status).toBe(503);expect(await response.json()).toEqual({students:null});
 expect(response.headers.get("Cache-Control")).toBe("no-store");
});

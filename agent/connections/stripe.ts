import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.stripe.com",
  description: "Payment processing and financial infrastructure tools",
  auth: connect("mcp.stripe.com/prj_y7xInoxOLGV5s5pfR6GCGazcets4"),
});

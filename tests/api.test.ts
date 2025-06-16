// describe("GET /api/users", () => {
//   it("should return paginated users", async () => {
//     const response = await request(app)
//       .get("/api/users?page=1&limit=10")
//       .expect(200);

//     expect(response.body.success).toBe(true);
//     expect(response.body.data.users).toHaveLength(10);
//     expect(response.body.data.pagination).toBeDefined();
//   });

//   it("should validate ethereum address", async () => {
//     const response = await request(app)
//       .get("/api/fees?integratorAddress=invalid")
//       .expect(400);

//     expect(response.body.error).toContain("Invalid Ethereum address");
//   });
// });

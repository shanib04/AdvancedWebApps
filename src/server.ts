// Itay-Ram-214294373-Shani-Bashari-325953743

import "dotenv/config";
import app from "./index";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;

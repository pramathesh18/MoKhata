import app from './app';
import { env } from './utils/env';

const PORT = parseInt(env.PORT, 10);

app.listen(PORT, () => {
  console.log(`🚀 MoKhata server running on port ${PORT} [${env.NODE_ENV}]`);
});

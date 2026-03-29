export interface Station {
  id: string;
  name: string;
  location: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

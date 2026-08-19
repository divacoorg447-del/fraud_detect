import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np

class AutoEncoderNet(nn.Module):
    def __init__(self, input_dim):
        super(AutoEncoderNet, self).__init__()
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 8),
            nn.ReLU(),
            nn.Linear(8, 4),
            nn.ReLU()
        )
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(4, 8),
            nn.ReLU(),
            nn.Linear(8, input_dim),
            nn.Sigmoid()
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

class PyTorchAutoEncoder:
    def __init__(self, input_dim, epochs=20, lr=0.01, batch_size=32):
        self.input_dim = input_dim
        self.epochs = epochs
        self.lr = lr
        self.batch_size = batch_size
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = AutoEncoderNet(input_dim).to(self.device)
        self.threshold = 0.5

    def fit(self, X):
        X_tensor = torch.tensor(X, dtype=torch.float32).to(self.device)
        optimizer = optim.Adam(self.model.parameters(), lr=self.lr)
        criterion = nn.MSELoss()
        
        self.model.train()
        dataset = torch.utils.data.TensorDataset(X_tensor, X_tensor)
        loader = torch.utils.data.DataLoader(dataset, batch_size=self.batch_size, shuffle=True)
        
        for epoch in range(self.epochs):
            for batch_x, batch_y in loader:
                optimizer.zero_grad()
                outputs = self.model(batch_x)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                
        # Determine threshold based on reconstruction errors
        self.model.eval()
        with torch.no_grad():
            preds = self.model(X_tensor)
            errors = torch.mean((X_tensor - preds) ** 2, dim=1).cpu().numpy()
            self.threshold = float(np.percentile(errors, 90))

    def predict(self, X):
        X_tensor = torch.tensor(X, dtype=torch.float32).to(self.device)
        self.model.eval()
        with torch.no_grad():
            preds = self.model(X_tensor)
            errors = torch.mean((X_tensor - preds) ** 2, dim=1).cpu().numpy()
            anomalies = (errors > self.threshold).astype(int)
            probs = errors / (errors.max() + 1e-6)
            return anomalies, probs

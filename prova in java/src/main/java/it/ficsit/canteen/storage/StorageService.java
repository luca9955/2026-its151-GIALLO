package it.ficsit.canteen.storage;

import it.ficsit.canteen.model.DashboardStats;
import it.ficsit.canteen.model.MenuItem;
import it.ficsit.canteen.model.Order;
import it.ficsit.canteen.model.Reservation;
import it.ficsit.canteen.model.Review;
import it.ficsit.canteen.model.TableSeat;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class StorageService {
    private final Path databasePath;
    private final List<StorageChangeListener> listeners = new ArrayList<>();
    private CanteenDatabase database;

    public StorageService() {
        this.databasePath = Path.of(System.getProperty("user.home"), ".ficsit-canteen", "database.bin");
        this.database = loadOrCreate();
    }

    public List<MenuItem> getMenu() {
        return List.copyOf(database.getMenu());
    }

    public void saveMenu(List<MenuItem> menu) {
        database.getMenu().clear();
        database.getMenu().addAll(menu);
        persistAndNotify();
    }

    public List<Reservation> getReservations() {
        return List.copyOf(database.getReservations());
    }

    public void saveReservations(List<Reservation> reservations) {
        database.getReservations().clear();
        database.getReservations().addAll(reservations);
        refreshTableStatuses();
        persistAndNotify();
    }

    public List<Order> getOrders() {
        return List.copyOf(database.getOrders());
    }

    public void saveOrders(List<Order> orders) {
        database.getOrders().clear();
        database.getOrders().addAll(orders);
        persistAndNotify();
    }

    public List<Review> getReviews() {
        return List.copyOf(database.getReviews());
    }

    public void saveReviews(List<Review> reviews) {
        database.getReviews().clear();
        database.getReviews().addAll(reviews);
        persistAndNotify();
    }

    public List<TableSeat> getTables() {
        return List.copyOf(database.getTables());
    }

    public DashboardStats getDashboardStats() {
        LocalDate today = LocalDate.now();
        int todayReservations = (int) database.getReservations().stream()
                .filter(reservation -> reservation.getDate().equals(today.toString()))
                .count();
        int activeOrders = (int) database.getOrders().stream()
                .filter(order -> List.of("Ricevuto", "Accettato", "In preparazione", "Pronto").contains(order.getStatus()))
                .count();
        double revenue = database.getOrders().stream()
                .filter(order -> order.getDate().equals(today))
                .mapToDouble(Order::getTotal)
                .sum();
        return new DashboardStats(todayReservations, activeOrders, database.getReviews().size(), revenue);
    }

    public String createId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    public void addListener(StorageChangeListener listener) {
        listeners.add(listener);
    }

    private CanteenDatabase loadOrCreate() {
        if (Files.exists(databasePath)) {
            try (ObjectInputStream input = new ObjectInputStream(Files.newInputStream(databasePath))) {
                return (CanteenDatabase) input.readObject();
            } catch (IOException | ClassNotFoundException ignored) {
                // If the local data is unreadable, the app recreates a clean demo database.
            }
        }
        CanteenDatabase seeded = new CanteenDatabase();
        seed(seeded);
        return seeded;
    }

    private void seed(CanteenDatabase seeded) {
        seeded.getMenu().add(new MenuItem("m-iron-steak", "Iron Plate Steak", "Forge Grill", "Tagliata affumicata con salsa pepe arancione FICSIT.", 18.50, true));
        seeded.getMenu().add(new MenuItem("m-conveyor-burger", "Conveyor Burger Mk.2", "Assembly Line", "Burger industriale con cheddar, cipolla croccante e chip di bauxite.", 15.90, true));
        seeded.getMenu().add(new MenuItem("m-nuclear-noodles", "Nuclear Noodles", "Power Plant", "Noodles verdi al lime, spezie e vapore controllato.", 13.20, true));
        seeded.getMenu().add(new MenuItem("m-alien-dessert", "Alien Biomass Cake", "Research Lab", "Dessert al pistacchio, cioccolato nero e glassa fluorescente.", 8.70, true));
        for (int i = 1; i <= 16; i++) {
            String status = i == 3 || i == 11 ? "Occupato" : "Libero";
            seeded.getTables().add(new TableSeat(i, status));
        }
    }

    private void refreshTableStatuses() {
        for (TableSeat table : database.getTables()) {
            if ("Occupato".equals(table.getStatus())) {
                continue;
            }
            boolean reserved = database.getReservations().stream()
                    .anyMatch(reservation -> reservation.getTableId() == table.getId() && !"Rifiutata".equals(reservation.getStatus()));
            table.setStatus(reserved ? "Prenotato" : "Libero");
        }
    }

    private void persistAndNotify() {
        try {
            Files.createDirectories(databasePath.getParent());
            try (ObjectOutputStream output = new ObjectOutputStream(Files.newOutputStream(databasePath))) {
                output.writeObject(database);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Impossibile salvare il database FICSIT", exception);
        }
        listeners.forEach(StorageChangeListener::onStorageChanged);
    }
}

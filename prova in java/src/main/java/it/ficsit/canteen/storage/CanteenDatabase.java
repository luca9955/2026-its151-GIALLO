package it.ficsit.canteen.storage;

import it.ficsit.canteen.model.MenuItem;
import it.ficsit.canteen.model.Order;
import it.ficsit.canteen.model.Reservation;
import it.ficsit.canteen.model.Review;
import it.ficsit.canteen.model.TableSeat;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class CanteenDatabase implements Serializable {
    private final List<MenuItem> menu = new ArrayList<>();
    private final List<Reservation> reservations = new ArrayList<>();
    private final List<Order> orders = new ArrayList<>();
    private final List<Review> reviews = new ArrayList<>();
    private final List<TableSeat> tables = new ArrayList<>();

    public List<MenuItem> getMenu() {
        return menu;
    }

    public List<Reservation> getReservations() {
        return reservations;
    }

    public List<Order> getOrders() {
        return orders;
    }

    public List<Review> getReviews() {
        return reviews;
    }

    public List<TableSeat> getTables() {
        return tables;
    }
}

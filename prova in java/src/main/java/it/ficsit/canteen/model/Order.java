package it.ficsit.canteen.model;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class Order implements Serializable {
    private final String id;
    private final String customer;
    private final String tableCode;
    private final List<OrderLine> lines;
    private final LocalDate date;
    private String status;

    public Order(String id, String customer, String tableCode, List<OrderLine> lines) {
        this.id = id;
        this.customer = customer;
        this.tableCode = tableCode;
        this.lines = new ArrayList<>(lines);
        this.status = "Ricevuto";
        this.date = LocalDate.now();
    }

    public String getId() {
        return id;
    }

    public String getCustomer() {
        return customer;
    }

    public String getTableCode() {
        return tableCode;
    }

    public List<OrderLine> getLines() {
        return List.copyOf(lines);
    }

    public double getTotal() {
        return lines.stream().mapToDouble(OrderLine::getSubtotal).sum();
    }

    public LocalDate getDate() {
        return date;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

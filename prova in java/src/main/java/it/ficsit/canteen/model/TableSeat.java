package it.ficsit.canteen.model;

import java.io.Serializable;

public class TableSeat implements Serializable {
    private final int id;
    private String status;

    public TableSeat(int id, String status) {
        this.id = id;
        this.status = status;
    }

    public int getId() {
        return id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

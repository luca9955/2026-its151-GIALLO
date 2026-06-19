package it.ficsit.canteen.model;

import java.io.Serializable;
import java.time.LocalDateTime;

public class Review implements Serializable {
    private final String id;
    private final String name;
    private final int rating;
    private final String comment;
    private final LocalDateTime createdAt;

    public Review(String id, String name, int rating, String comment) {
        this.id = id;
        this.name = name;
        this.rating = rating;
        this.comment = comment;
        this.createdAt = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}

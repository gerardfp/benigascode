import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;


class Author {
    String name;
    String photoURL;
}

class Post {
    Author author;
    String content;
}

class Stream {
    Post[] posts;
}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int nPosts = scanner.nextInt();

        Stream stream = new Stream();

        stream.posts = new Post[nPosts];

        for (int i = 0; i < nPosts; i++) {

            // escriu aqui el codi

            stream.posts[i].author.name = scanner.next();
            stream.posts[i].author.photoURL = scanner.next();
            stream.posts[i].content = scanner.next() + scanner.nextLine();
        }

        for (int i = 0; i < nPosts; i++) {
            System.out.println(stream.posts[i].author.name);
            System.out.println(stream.posts[i].content);
            System.out.println("------------------------------");
        }
    }
}
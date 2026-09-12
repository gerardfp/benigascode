// Defineix aqui la classe Box

public class Main {

    public static void main(String[] args) {
      	Box box = new Box();
      
      	box.length = 10000.5f;
      	box.height = 3000.5f;
      	box.width = 4000.75f;
      
      	box.innerBox = new Box();

      	box.innerBox.length = 1000.5f;
      	box.innerBox.height = 300.5f;
      	box.innerBox.width = 400.75f;

		box.innerBox.innerBox = new Box();
      
      	box.innerBox.innerBox.length = 100.5f;
      	box.innerBox.innerBox.height = 30.5f;
      	box.innerBox.innerBox.width = 40.75f;

      	box.innerBox.innerBox.innerBox = new Box();
      
      	box.innerBox.innerBox.innerBox.length = 10.5f;
      	box.innerBox.innerBox.innerBox.height = 3.5f;
      	box.innerBox.innerBox.innerBox.width = 4.75f;
      
      	System.out.println(box.innerBox.innerBox.innerBox.width);
    }
}